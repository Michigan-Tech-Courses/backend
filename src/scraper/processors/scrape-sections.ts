import {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import equal from 'deep-equal';
import {Except} from 'type-fest';
import arrDiff from 'arr-diff';
import pThrottle from 'p-throttle';
import prisma from 'src/lib/prisma-singleton';
import {Section, Prisma} from '@prisma/client';
import {getAllSections, ICourseOverview, ISection} from '@mtucourses/scraper';
import {CourseMap} from 'src/lib/course-map';
import {IRuleOptions, Schedule} from 'src/lib/rschedule';
import {calculateDiffInTime, dateToTerm, mapDayCharToRRScheduleString} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';
import getTermsToProcess from 'src/lib/get-terms-to-process';

type BasicSection = Except<Section, 'id' | 'updatedAt' | 'deletedAt' | 'courseId'>;

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

const processJob = async (_: Job) => {
	const logger = new Logger('Job: course sections scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	// For all terms
	const terms = await getTermsToProcess();
	await Promise.all(terms.map(async term => {
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
		for (const storedCourse of storedCourses) {
			didSeeCourseInScrapedData.put({saw: false, course: storedCourse});
		}

		const courseUpserter = pThrottle({
			limit: 5,
			interval: 100
		})(async (scrapedCourse: ICourseOverview) => {
			const uniqueSelector = {year, semester, subject: scrapedCourse.subject, crse: scrapedCourse.crse};

			let storedCourse = await prisma.course.findFirst({
				where: {
					year,
					semester,
					subject: scrapedCourse.subject,
					crse: scrapedCourse.crse
				}
			});

			let shouldUpsert = true;

			if (storedCourse) {
				shouldUpsert = false;

				didSeeCourseInScrapedData.markAsSeen(storedCourse);

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
			const sectionUpserter = pThrottle({
				limit: 1,
				interval: 50
			})(async (scrapedSection: BasicSection) => {
				let storedSection = await prisma.section.findFirst({
					where: {
						courseId: storedCourse!.id,
						section: scrapedSection.section
					}
				});

				if (storedSection) {
					// Check if there's any difference
					const {id, courseId, updatedAt, deletedAt, ...storedSectionToCompare} = storedSection;

					if (!equal(storedSectionToCompare, scrapedSection) || storedSection.deletedAt) {
						// Section needs to be updated
						// (We're not actually updating many, but relations
						// can't be marked as unique in Prisma.)
						await prisma.section.updateMany({
							where: {
								courseId: storedCourse!.id,
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
							courseId: storedCourse!.id
						}
					});
				}

				sawSectionIds.push(storedSection.id);
			});

			await Promise.all(
				scrapedCourse.sections
					.map(section => reshapeSectionFromScraperToDatabase(section, year))
					.map(async scrapedSection => sectionUpserter(scrapedSection))
			);
		});

		// Upsert courses in database from scraped data
		await Promise.all(courses.map(async scrapedCourse => courseUpserter(scrapedCourse)));

		// Mark courses that didn't show up
		const coursesToDelete = didSeeCourseInScrapedData.getUnseen();

		await prisma.course.updateMany({
			where: {
				id: {
					in: coursesToDelete.map(c => c.id)
				}
			},
			data: {
				deletedAt: new Date()
			}
		});

		// Mark sections that didn't show up
		const storedSectionIds = await prisma.section.findMany({
			select: {id: true},
			where: {
				course: {
					semester,
					year
				}
			}
		});

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

	await Promise.all([prisma.$disconnect(), deleteByKey('/courses'), deleteByKey('/sections')]);
};

export default processJob;
