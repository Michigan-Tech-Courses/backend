import {Logger} from '@nestjs/common';
import {getAllTransferCourses, ITransferCourse} from '@mtucourses/scraper';
import prisma from 'src/lib/prisma-singleton';
import {deleteByKey} from 'src/cache/store';
import {TransferCourse} from '.prisma/client';
import pThrottle from 'p-throttle';
import {Except} from 'type-fest';

const processJob = async () => {
	const logger = new Logger('Job: course sections scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	const processCourse = async (course: ITransferCourse) => {
		const uniqueWhere = {
			fromCollege_fromCRSE_fromSubject_toCRSE_toSubject: {
				fromCollege: course.from.college,
				fromCRSE: course.from.crse,
				fromSubject: course.from.subject,
				toCRSE: course.to.crse,
				toSubject: course.to.subject
			}
		};

		const existingCourse = await prisma.transferCourse.findUnique({
			where: uniqueWhere
		});

		let shouldUpsert = !existingCourse;

		if (existingCourse) {
			if (existingCourse.fromCredits !== course.from.credits) {
				shouldUpsert = true;
			}

			if (existingCourse.toCredits !== course.to.credits) {
				shouldUpsert = true;
			}

			if (existingCourse.title !== course.to.title) {
				shouldUpsert = true;
			}
		}

		if (shouldUpsert) {
			const model: Except<TransferCourse, 'id'> = {
				fromCollege: course.from.college,
				fromCollegeState: course.from.state,
				fromCRSE: course.from.crse,
				fromCredits: course.from.credits,
				fromSubject: course.from.subject,
				toCRSE: course.to.crse,
				toCredits: course.to.credits,
				toSubject: course.to.subject,
				title: course.to.title
			};

			await prisma.transferCourse.upsert({
				where: uniqueWhere,
				create: model,
				update: model
			});
		}
	};

	const throttledProcessCourse = pThrottle({interval: 264, limit: 8})(processCourse);

	const courses = await getAllTransferCourses();

	await Promise.all(courses.map(async course => throttledProcessCourse(course)));

	logger.log('Finished processing');

	await Promise.all([prisma.$disconnect(), deleteByKey('/transfer-courses')]);
};

export default processJob;
