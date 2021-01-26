import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient, Semester} from '@prisma/client';
import {getAllSections} from '@mtucourses/scrapper';
import {CourseMap} from 'src/lib/course-map';

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

const dateToTerm = (date: Date) => {
	let semester: Semester = Semester.SPRING;

	if (date.getMonth() === 4) {
		semester = Semester.SUMMER;
	} else if (date.getMonth() === 7) {
		semester = Semester.FALL;
	}

	return {semester, year: date.getFullYear()};
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

		// Map that keeps track of whether or not a course in the database appears in the scrape
		const didSeeCourseInScrappedData = new CourseMap();
		storedCourses.forEach(storedCourse => {
			didSeeCourseInScrappedData.put({saw: false, course: storedCourse});
		});

		// Upsert courses in database from scrapped data
		await Promise.all(courses.map(async scrappedCourse => {
			const uniqueSelector = {year, semester, subject: scrappedCourse.subject, crse: scrappedCourse.crse};

			const storedCourse = didSeeCourseInScrappedData.get(uniqueSelector);
			didSeeCourseInScrappedData.markAsSeen(uniqueSelector);

			let shouldUpsert = true;

			if (storedCourse) {
				shouldUpsert = false;

				// The only attribute that can change without becoming a new row is the title
				// (description field is scrapped somewhere else)
				if (storedCourse.title !== scrappedCourse.title) {
					shouldUpsert = true;
				}
			}

			if (shouldUpsert) {
				const courseToUpsert = {
					year,
					semester,
					subject: scrappedCourse.subject,
					crse: scrappedCourse.crse,
					title: scrappedCourse.title,
					updatedAt: new Date()
				};

				await prisma.course.upsert({
					where: {
						year_semester_subject_crse: uniqueSelector
					},
					create: courseToUpsert,
					update: courseToUpsert
				});
			}
		}));

		// Mark courses that didn't show up
		const coursesToDelete = didSeeCourseInScrappedData.getUnseen();

		await Promise.all(coursesToDelete.map(async courseToDelete => {
			await prisma.course.update({
				where: {
					year_semester_subject_crse: {
						year: courseToDelete.year,
						semester: courseToDelete.semester,
						subject: courseToDelete.subject,
						crse: courseToDelete.crse
					}
				},
				data: {
					deletedAt: new Date()
				}
			});
		}));
	}));

	logger.log('Finished processing');

	await prisma.$disconnect();

	cb(null, null);
};

export default processJob;
