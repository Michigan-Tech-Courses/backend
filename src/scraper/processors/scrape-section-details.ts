/* eslint-disable no-await-in-loop */
import {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import prisma from 'src/lib/prisma-singleton';
import equal from 'deep-equal';
import arrDiff from 'arr-diff';
import {getSectionDetails} from '@mtucourses/scraper';
import {dateToTerm, termToDate} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime';
import sortByNullValues from 'src/lib/sort-by-null-values';
import getTermsToProcess from 'src/lib/get-terms-to-process';

const processJob = async (_: Job) => {
	const logger = new Logger('Job: course section details scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	let sectionsToProcess = [];
	let numberOfSectionsProcessed = 0;

	const terms = await getTermsToProcess();

	const throttledGetSectionDetails = pThrottle({limit: 2, interval: 100})(getSectionDetails);
	const throttledRawQuery = pThrottle({limit: 2, interval: 100})(prisma.$queryRaw);

	const throttledInstructorCreate = pThrottle({limit: 2, interval: 100})(prisma.instructor.create);
	const throttledInstructorFindUnique = pThrottle({limit: 2, interval: 100})(prisma.instructor.findUnique);

	const throttledSectionUpdate = pThrottle({limit: 2, interval: 100})(prisma.section.update);
	const throttledCourseUpdate = pThrottle({limit: 2, interval: 100})(prisma.course.update);

	while (true) {
		sectionsToProcess = await prisma.section.findMany({
			orderBy: {
				id: 'asc'
			},
			take: 20,
			skip: numberOfSectionsProcessed,
			include: {
				course: true,
				instructors: {
					select: {
						id: true
					},
					orderBy: {
						id: 'asc'
					}
				}
			},
			where: {
				course: {
					OR: terms.map(t => ({
						year: dateToTerm(t).year,
						semester: dateToTerm(t).semester
					}))
				},
				deletedAt: null
			}
		});

		if (sectionsToProcess.length === 0) {
			break;
		}

		await Promise.all(sectionsToProcess.map(async section => {
			let details;

			try {
				details = await throttledGetSectionDetails({
					subject: section.course.subject,
					crse: section.course.crse,
					crn: section.crn,
					term: termToDate({year: section.course.year, semester: section.course.semester})
				});
			} catch (error: unknown) {
				if ((error as Error).message === 'Course not found') {
					console.log(`Did not find ${section.course.id}: ${JSON.stringify(section.course)}`);
					console.log('It should be cleaned up automatically on the next course scrape.');
					return;
				}

				throw error;
			}

			const scrapedInstructors = details.instructors;

			// Update instructors
			const instructors: Array<{id: number}> = [];

			if (scrapedInstructors.length > 0) {
				const consumedNames: string[] = [];

				await Promise.all(scrapedInstructors.map(async instructorName => {
					const fragmentedName = instructorName.split(' ');
					const firstName = fragmentedName[0];
					const lastName = fragmentedName[fragmentedName.length - 1];

					const results: Array<{id: number}> = await throttledRawQuery('SELECT id FROM "Instructor" WHERE "fullName" SIMILAR TO $1;', `(${firstName} % ${lastName})|(${instructorName})|(${firstName} ${lastName})|(${firstName} ${lastName} %)|(${firstName} % ${lastName} %)`);

					if (results.length > 0) {
						instructors.push({id: sortByNullValues(results)[0].id});
						consumedNames.push(instructorName);
					}
				}));

				// Create new instructors if some weren't found
				const unconsumedNames = arrDiff(scrapedInstructors, consumedNames);

				if (unconsumedNames.length > 0) {
					await Promise.all(unconsumedNames.map(async name => {
						try {
							const newInstructor = await throttledInstructorCreate({
								data: {
									fullName: name
								}
							});

							instructors.push({id: newInstructor.id});
						} catch (error: unknown) {
							if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
								// Race condition because all sections are looking and creating for instructors at the same time.
								// Possible for one to create an instructor and a sibling run to also create, resulting in this error.
								// Hacky solutions FTW.
								const previouslyCreatedInstructor = await throttledInstructorFindUnique({
									where: {
										fullName: name
									}
								});

								if (previouslyCreatedInstructor) {
									instructors.push({id: previouslyCreatedInstructor.id});
								}
							} else {
								throw error;
							}
						}
					}));
				}
			}

			const foundInstructorIds = instructors.map(i => i.id);
			const storedInstructorIds = section.instructors.map(i => i.id);

			if (!equal(foundInstructorIds, storedInstructorIds)) {
				await throttledSectionUpdate({
					where: {
						id: section.id
					},
					data: {
						instructors: {
							connect: arrDiff(foundInstructorIds, storedInstructorIds).map(i => ({id: i})),
							disconnect: arrDiff(storedInstructorIds, foundInstructorIds).map(i => ({id: i}))
						}
					}
				});
			}

			// Update description
			if (details.description !== section.course.description) {
				await throttledCourseUpdate({
					where: {
						id: section.courseId
					},
					data: {
						description: details.description
					}
				});
			}

			// Update prereqs
			if (details.prereqs !== section.course.prereqs) {
				await prisma.course.update({
					where: {
						id: section.courseId
					},
					data: {
						prereqs: details.prereqs
					}
				});
			}
		}));

		numberOfSectionsProcessed += sectionsToProcess.length;
	}

	logger.log('Finished processing');

	await Promise.all([prisma.$disconnect(), deleteByKey('/courses'), deleteByKey('/sections')]);
};

export default processJob;
