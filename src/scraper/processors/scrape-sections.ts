import type {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import equal from 'deep-equal';
import type {Except} from 'type-fest';
import arrDiff from 'arr-diff';
import pThrottle from 'p-throttle';
import prisma from 'src/lib/prisma-singleton';
import type {Section, Prisma} from '@prisma/client';
import type {ICourseOverview, ISection} from '@mtucourses/scraper';
import {getAllSections} from '@mtucourses/scraper';
import {CourseMap} from 'src/lib/course-map';
import type {IRuleOptions} from 'src/lib/rschedule';
import {Schedule} from 'src/lib/rschedule';
import {calculateDiffInTime, dateToTerm, mapDayCharToRRScheduleString} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';
import getTermsToProcess from 'src/lib/get-terms-to-process';

type ModifiableSection = Except<Section, 'id' | 'updatedAt' | 'deletedAt' | 'courseId' | 'buildingName' | 'locationType' | 'room'>;

type ModifiableSectionInput = ModifiableSection & {time: Prisma.InputJsonValue | undefined};

const reshapeSectionFromScraperToDatabase = (section: ISection, year: number): ModifiableSectionInput => {
	const scheduleRules: IRuleOptions[] = [];

	for (const schedule of section.schedules) {
		if (schedule.timeRange.length === 2 && schedule.dateRange.length === 2 && !['', 'TBA'].includes(schedule.days))	{
			const start = new Date(`${schedule.dateRange[0]}/${year} ${schedule.timeRange[0]}`);
			const end = new Date(`${schedule.dateRange[1]}/${year} ${schedule.timeRange[1]}`);

			scheduleRules.push({
				frequency: 'WEEKLY',
				duration: calculateDiffInTime(schedule.timeRange[0], schedule.timeRange[1]),
				byDayOfWeek: schedule.days.split('').map(d => mapDayCharToRRScheduleString(d)),
				start,
				end
			});
		}
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
		time: (schedule as any).toJSON(),
		totalSeats: section.seats,
		takenSeats: section.seatsTaken,
		availableSeats: section.seatsAvailable,
		fee: Math.round(section.fee)
	};
};

const getCreditsRangeFromCourse = (course: ICourseOverview): [number, number] => {
	let min = Number.MAX_SAFE_INTEGER;
	let max = Number.MIN_SAFE_INTEGER;

	for (const section of course.sections) {
		if (section.creditRange.length === 2) {
			const [
				sectionMin,
				sectionMax
			] = section.creditRange;

			if (sectionMin < min) {
				min = sectionMin;
			}

			if (sectionMax > max) {
				max = sectionMax;
			}
		} else {
			const [minAndMax] = section.creditRange;

			if (minAndMax < min) {
				min = minAndMax;
			}

			if (minAndMax > max) {
				max = minAndMax;
			}
		}
	}

	return [
		min === Number.MAX_SAFE_INTEGER ? 0 : min,
		max === Number.MIN_SAFE_INTEGER ? 0 : max
	];
};

const areCreditRangesEqual = (firstRange: [number, number], secondRange: [number, number]) => firstRange[0] === secondRange[0] && firstRange[1] === secondRange[1];

const processJob = async (_: Job) => {
	const logger = new Logger('Job: course sections scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	const processTerm = pThrottle({limit: 3, interval: 100})(async (term: Date) => {
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

				// The only two attributes that can change without becoming a new row is the title or credits
				// (description field is scraped somewhere else)
				if (storedCourse.title !== scrapedCourse.title || storedCourse.deletedAt) {
					shouldUpsert = true;
				}

				if (!areCreditRangesEqual([
					storedCourse.minCredits,
					storedCourse.maxCredits
				], getCreditsRangeFromCourse(scrapedCourse))) {
					shouldUpsert = true;
				}
			}

			if (shouldUpsert) {
				const [minCredits, maxCredits] = getCreditsRangeFromCourse(scrapedCourse);
				const courseToUpsert: Prisma.CourseCreateInput = {
					year,
					semester,
					subject: scrapedCourse.subject,
					crse: scrapedCourse.crse,
					title: scrapedCourse.title,
					minCredits,
					maxCredits,
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
			})(async (scrapedSection: ModifiableSectionInput) => {
				let storedSection = await prisma.section.findFirst({
					where: {
						courseId: storedCourse!.id,
						section: scrapedSection.section
					}
				});

				if (storedSection) {
					// Check if there's any difference
					const storedSectionToCompare: ModifiableSection = {
						crn: storedSection.crn,
						section: storedSection.section,
						cmp: storedSection.cmp,
						minCredits: storedSection.minCredits,
						maxCredits: storedSection.maxCredits,
						time: storedSection.time,
						totalSeats: storedSection.totalSeats,
						takenSeats: storedSection.takenSeats,
						availableSeats: storedSection.availableSeats,
						fee: storedSection.fee
					};

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

		if (coursesToDelete.length > 0) {
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
		}

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
	});

	// For all terms
	const terms = await getTermsToProcess();
	await Promise.all(terms.map(async term => processTerm(term)));

	logger.log('Finished processing');

	await Promise.all([prisma.$disconnect(), deleteByKey('/courses'), deleteByKey('/sections')]);
};

export default processJob;
