import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import equal from 'deep-equal';
import {Except} from 'type-fest';
import arrDiff from 'arr-diff';
import pLimit from 'p-limit';
import {PrismaClient, Section, Prisma} from '@prisma/client';
import {getAllSections, ISection} from '@mtucourses/scraper';
import {CourseMap} from 'src/lib/course-map';
import {IRuleOptions, Schedule} from 'src/lib/rschedule';
import {calculateDiffInTime, dateToTerm, mapDayCharToRRScheduleString} from 'src/lib/dates';
import {getUniqueCompositeForCourse} from 'src/lib/courses';

const getTermsForYear = (year: number) => {
	const spring = new Date();
	spring.setFullYear(year, 0);

	const summer = new Date();
	summer.setFullYear(year, 4);

	const fall = new Date();
	fall.setFullYear(year, 7);

	return [spring, summer, fall];
};

const getTermsToProcess = () => {
	const now = new Date();
	const year = now.getFullYear();

	const terms = [...getTermsForYear(year - 1), ...getTermsForYear(year), ...getTermsForYear(year + 1)];

	const toProcess = [];

	for (let i = 0; i < terms.length; i++) {
		if (now < terms[i]) {
			toProcess.push(terms[i - 2], terms[i - 1], terms[i]);
			break;
		}
	}

	return toProcess;
};

type BasicSection = Except<Section, 'id' | 'updatedAt' | 'deletedAt' | 'courseYear' | 'courseSemester' | 'courseSubject' | 'courseCrse'>;

const reshapeSectionFromScraperToDatabase = (section: ISection, year: number): BasicSection => {
	const scheduleRules: IRuleOptions[] = [];

	if (section.timeRange?.length === 2 && section.dateRange.length === 2 && section.days !== '' && section.days !== 'TBA') {
		const start = new Date(`${section.dateRange[0]}/${year} ${section.timeRange[0]}`);
		const end = new Date(`${section.dateRange[1]}/${year} ${section.timeRange[1]}`);

		scheduleRules.push({
			frequency: 'WEEKLY',
			duration: calculateDiffInTime(section.timeRange[0], section.timeRange[1]),
			byDayOfWeek: section.days.split('').map(d => mapDayCharToRRScheduleString(d)),
			start,
			end
		});
	}

	const schedule = new Schedule({
		rrules: scheduleRules
	});

	return {
		crn: section.crn,
		section: section.section,
		cmp: section.cmp,
		minCredits: Math.min(...section.creditRange),
		maxCredits: Math.max(...section.creditRange),
		time: (schedule as any).toJSON() as unknown as Prisma.JsonObject,
		totalSeats: section.seats,
		takenSeats: section.seatsTaken,
		availableSeats: section.seatsAvailable,
		fee: Math.round(section.fee)
	};
};

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: course sections scrape');

	logger.log('Started processing...');

	const prisma = new PrismaClient();
	await prisma.$connect();

	// For all terms
	await Promise.all(getTermsToProcess().map(async term => {
		const {semester, year} = dateToTerm(term);
		// Scrape courses for this term and get stored courses
		const [courses, storedCourses] = await Promise.all([
			getAllSections(term),
			prisma.course.findMany({
				where: {
					semester,
					year
				}
			})
		]);

		const sawSectionIds: string[] = [];

		// Map that keeps track of whether or not a course in the database appears in the scrape
		const didSeeCourseInScrapedData = new CourseMap();
		storedCourses.forEach(storedCourse => {
			didSeeCourseInScrapedData.put({saw: false, course: storedCourse});
		});

		const courseInsertLimit = pLimit(10);

		// Upsert courses in database from scraped data
		await Promise.all(courses.map(async scrapedCourse => courseInsertLimit(async () => {
			const uniqueSelector = {year, semester, subject: scrapedCourse.subject, crse: scrapedCourse.crse};

			let storedCourse = didSeeCourseInScrapedData.get(uniqueSelector);
			didSeeCourseInScrapedData.markAsSeen(uniqueSelector);

			let shouldUpsert = true;

			if (storedCourse) {
				shouldUpsert = false;

				// The only attribute that can change without becoming a new row is the title
				// (description field is scraped somewhere else)
				if (storedCourse.title !== scrapedCourse.title || storedCourse.deletedAt) {
					shouldUpsert = true;
				}
			}

			if (shouldUpsert) {
				const courseToUpsert = {
					year,
					semester,
					subject: scrapedCourse.subject,
					crse: scrapedCourse.crse,
					title: scrapedCourse.title,
					updatedAt: new Date(),
					deletedAt: null
				};

				storedCourse = await prisma.course.upsert({
					where: {
						year_semester_subject_crse: uniqueSelector
					},
					create: courseToUpsert,
					update: courseToUpsert
				});
			}

			// Upsert course sections
			const sectionInsertLimit = pLimit(2);

			await Promise.all(
				scrapedCourse.sections
					.map(section => reshapeSectionFromScraperToDatabase(section, year))
					.map(async scrapedSection => sectionInsertLimit(async () => {
						let storedSection = await prisma.section.findFirst({
							where: {
								course: storedCourse!,
								section: scrapedSection.section
							}
						});

						if (storedSection) {
							// Check if there's any difference
							const {id, courseCrse, courseSemester, courseSubject, courseYear, updatedAt, deletedAt, ...storedSectionToCompare} = storedSection;

							if (!equal(storedSectionToCompare, scrapedSection) || storedSection.deletedAt) {
								// Section needs to be updated
								// (We're not actually updating many, but relations
								// can't be marked as unique in Prisma.)
								await prisma.section.updateMany({
									where: {
										course: getUniqueCompositeForCourse(storedCourse!),
										section: scrapedSection.section
									},
									data: {
										...scrapedSection,
										deletedAt: null
									}
								});
							}
						} else {
							// Section doesn't exist; create
							storedSection = await prisma.section.create({
								data: {
									...scrapedSection,
									course: {
										connect: {
											year_semester_subject_crse: getUniqueCompositeForCourse(storedCourse!)
										}
									}
								}
							});
						}

						sawSectionIds.push(storedSection.id);
					})
					)
			);
		})));

		// Mark courses that didn't show up
		const coursesToDelete = didSeeCourseInScrapedData.getUnseen();

		await Promise.all(coursesToDelete.map(async courseToDelete => {
			await prisma.course.update({
				where: {
					year_semester_subject_crse: getUniqueCompositeForCourse(courseToDelete)
				},
				data: {
					deletedAt: new Date()
				}
			});
		}));

		// Mark sections that didn't show up
		const storedSectionIds = await prisma.section.findMany({select: {id: true}});

		const unseenSectionIds = arrDiff(storedSectionIds.map(s => s.id), sawSectionIds);

		if (unseenSectionIds.length > 0) {
			await prisma.section.updateMany({
				where: {
					id: {
						in: unseenSectionIds
					}
				},
				data: {
					deletedAt: new Date()
				}
			});
		}
	}));

	logger.log('Finished processing');

	await prisma.$disconnect();

	cb(null, null);
};

export default processJob;
