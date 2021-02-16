/* eslint-disable no-await-in-loop */
import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import prisma from 'src/lib/prisma-singleton';
import equal from 'deep-equal';
import arrDiff from 'arr-diff';
import {getSectionDetails} from '@mtucourses/scraper';
import {termToDate} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime';

const CONCURRENCY_LIMIT = 15;

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: course section details scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	let sectionsToProcess = [];
	let numberOfSectionsProcessed = 0;

	while (true) {
		sectionsToProcess = await prisma.section.findMany({
			orderBy: {
				id: 'asc'
			},
			take: CONCURRENCY_LIMIT,
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
			}
		});

		if (sectionsToProcess.length === 0) {
			break;
		}

		await Promise.all(sectionsToProcess.map(async section => {
			const details = await getSectionDetails({
				subject: section.course.subject,
				crse: section.course.crse,
				crn: section.crn,
				term: termToDate({year: section.course.year, semester: section.course.semester})
			});

			const scrapedInstructors = details.instructors;

			// Update instructors
			const instructors: Array<{id: number}> = [];

			if (scrapedInstructors.length > 0) {
				const consumedNames: string[] = [];

				await Promise.all(scrapedInstructors.map(async instructorName => {
					const fragmentedName = instructorName.split(' ');
					const firstName = fragmentedName[0];
					const lastName = fragmentedName[fragmentedName.length - 1];

					const results: Array<{id: number}> = await prisma.$queryRaw('SELECT id FROM "Instructor" WHERE "fullName" SIMILAR TO $1;', `(${firstName} % ${lastName})|(${instructorName})`);

					if (results.length > 0) {
						instructors.push({id: results[0].id});
						consumedNames.push(instructorName);
					}
				}));

				// Create new instructors if some weren't found
				const unconsumedNames = arrDiff(scrapedInstructors, consumedNames);

				if (unconsumedNames.length > 0) {
					await Promise.all(unconsumedNames.map(async name => {
						try {
							const newInstructor = await prisma.instructor.create({
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
								const previouslyCreatedInstructor = await prisma.instructor.findUnique({
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
				await prisma.section.update({
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
				await prisma.course.update({
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

	cb(null, null);
};

export default processJob;
