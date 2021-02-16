/* eslint-disable no-await-in-loop */
import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import prisma from 'src/lib/prisma-singleton';
import equal from 'deep-equal';
import arrDiff from 'arr-diff';
import {getSectionDetails} from '@mtucourses/scraper';
import {termToDate} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';

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

			// Update instructors
			let instructors: Array<{id: number}> = [];

			if (details.instructors.length > 0) {
				instructors = await prisma.instructor.findMany({
					where: {
						OR: details.instructors.map(instructor => {
							const fragmentedName = instructor.split(' ');
							const firstName = fragmentedName[0];
							const lastName = fragmentedName[fragmentedName.length - 1];

							return {
								fullName: {
									contains: `${firstName} % ${lastName}`
								}
							};
						})
					},
					select: {
						id: true
					},
					orderBy: {
						id: 'asc'
					}
				});
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
