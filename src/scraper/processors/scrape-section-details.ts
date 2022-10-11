/* eslint-disable no-await-in-loop */
import type {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import prisma from 'src/lib/prisma-singleton';
import equal from 'deep-equal';
import arrDiff from 'arr-diff';
import type {ISectionDetails} from '@mtucourses/scraper';
import {ESemester, getSectionDetails} from '@mtucourses/scraper';
import {dateToTerm, termToDate} from 'src/lib/dates';
import {deleteByKey} from 'src/cache/store';
import {PrismaClientKnownRequestError} from '@prisma/client/runtime';
import sortByNullValues from 'src/lib/sort-by-null-values';
import getTermsToProcess from 'src/lib/get-terms-to-process';
import parseLocation from 'src/lib/parse-location';
import type {Prisma, Section} from '@prisma/client';
import {Semester} from '@prisma/client';

const convertSemesters = (semesters: ESemester[]): Semester[] => {
	const result: Semester[] = [];

	for (const semester of semesters) {
		switch (semester) {
			case ESemester.fall:
				result.push(Semester.FALL);
				break;
			case ESemester.spring:
				result.push(Semester.SPRING);
				break;
			case ESemester.summer:
				result.push(Semester.SUMMER);
				break;
			default:
				break;
		}
	}

	return result;
};

const processJob = async (_: Job) => {
	const logger = new Logger('Job: course section details scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	let sectionsToProcess = [];
	let numberOfSectionsProcessed = 0;

	const terms = await getTermsToProcess();

	const throttledGetSectionDetails = pThrottle({limit: 2, interval: 100})(getSectionDetails);

	const allBuildings = await prisma.building.findMany();

	while (true) {
		sectionsToProcess = await prisma.section.findMany({
			orderBy: {
				id: 'asc'
			},
			take: 32,
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
			let details: ISectionDetails;

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
					if (instructorName.trim() === '') {
						consumedNames.push(instructorName);
						return;
					}

					const fragmentedName = instructorName.split(' ');
					const firstName = fragmentedName[0];
					const lastName = fragmentedName[fragmentedName.length - 1];

					// First try searching by full name
					let results = await prisma.instructor.findMany({
						where: {
							fullName: {
								search: fragmentedName.join(' & ')
							}
						}
					});

					if (results.length === 0) {
						results = await prisma.instructor.findMany({
							where: {
								fullName: {
									search: `${firstName} & ${lastName}`
								}
							}
						});
					}

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

			/* Update section */
			let updatedSectionData: Prisma.SectionUpdateInput = {};

			const foundInstructorIds = instructors.map(i => i.id);
			const storedInstructorIds = section.instructors.map(i => i.id);

			if (!equal(foundInstructorIds, storedInstructorIds)) {
				updatedSectionData.instructors = {
					connect: arrDiff(foundInstructorIds, storedInstructorIds).map(i => ({id: i})),
					disconnect: arrDiff(storedInstructorIds, foundInstructorIds).map(i => ({id: i}))
				};
			}

			const previousLocation: Pick<Section, 'locationType' | 'buildingName' | 'room'> = {
				locationType: section.locationType,
				buildingName: section.buildingName,
				room: section.room
			};

			const newLocation = parseLocation(details.location, allBuildings);

			if (!equal(previousLocation, newLocation)) {
				const {buildingName, ...otherNewLocationParameters} = newLocation;

				if (buildingName) {
					updatedSectionData = {
						...updatedSectionData,
						...otherNewLocationParameters,
						building: {
							connect: {
								name: buildingName
							}
						}
					};
				} else {
					updatedSectionData = {
						...updatedSectionData,
						...otherNewLocationParameters,
						building: {
							disconnect: true
						}
					};
				}
			}

			const shouldUpdateSection = Object.keys(updatedSectionData).length > 0;

			if (shouldUpdateSection) {
				await prisma.section.update({
					where: {
						id: section.id
					},
					data: updatedSectionData
				});
			}

			/* Update course */
			let shouldUpdateCourse = false;

			const scrapedSemestersOffered = convertSemesters(details.semestersOffered);

			// Update offered semesters
			if (arrDiff(scrapedSemestersOffered, section.course.offered).length > 0 || arrDiff(section.course.offered, scrapedSemestersOffered).length > 0) {
				shouldUpdateCourse = true;
			}

			// Update description
			if (details.description !== section.course.description) {
				shouldUpdateCourse = true;
			}

			// Update prereqs
			if (details.prereqs !== section.course.prereqs) {
				shouldUpdateCourse = true;
			}

			if (shouldUpdateCourse) {
				await prisma.course.update({
					where: {
						id: section.courseId
					},
					data: {
						description: details.description,
						prereqs: details.prereqs,
						offered: scrapedSemestersOffered
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
