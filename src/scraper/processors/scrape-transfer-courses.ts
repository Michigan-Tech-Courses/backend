import {Logger} from '@nestjs/common';
import {getAllTransferCourses, ITransferCourse} from '@mtucourses/scraper';
import prisma from 'src/lib/prisma-singleton';
import {deleteByKey} from 'src/cache/store';
import pThrottle from 'p-throttle';
import {Except} from 'type-fest';
import {Prisma, TransferCourse} from '@prisma/client';

const processJob = async () => {
	const logger = new Logger('Job: transfer courses scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	const savedCourses = await prisma.transferCourse.findMany({select: {id: true}});
	const seenCourses = new Map();

	for (const savedCourse of savedCourses) {
		seenCourses.set(savedCourse.id, false);
	}

	const processCourse = async (course: ITransferCourse) => {
		const uniqueWhere: Prisma.TransferCourseWhereUniqueInput = {
			fromCollege_fromCRSE_fromSubject_toCRSE_toSubject_toCredits: {
				fromCollege: course.from.college,
				fromCRSE: course.from.crse,
				fromSubject: course.from.subject,
				toCRSE: course.to.crse,
				toSubject: course.to.subject,
				toCredits: course.to.credits
			}
		};

		const existingCourse = await prisma.transferCourse.findUnique({
			where: uniqueWhere
		});

		let shouldUpsert = false;

		if (existingCourse) {
			seenCourses.set(existingCourse.id, true);

			if (existingCourse.fromCredits !== course.from.credits) {
				shouldUpsert = true;
			}

			if (existingCourse.toCredits !== course.to.credits) {
				shouldUpsert = true;
			}

			if (existingCourse.title !== course.to.title) {
				shouldUpsert = true;
			}
		} else {
			shouldUpsert = true;
		}

		if (shouldUpsert) {
			const model: Except<TransferCourse, 'id' | 'updatedAt'> = {
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

	const throttledProcessCourse = pThrottle({interval: 128, limit: 2})(processCourse);

	const courses = await getAllTransferCourses();

	await Promise.all(courses.map(async course => throttledProcessCourse(course)));

	// Delete courses that didn't show up
	const unseenIds: Array<TransferCourse['id']> = [];
	for (const [courseId, seen] of seenCourses) {
		if (!seen) {
			unseenIds.push(courseId);
		}
	}

	await prisma.transferCourse.deleteMany({
		where: {
			id: {
				in: unseenIds
			}
		}
	});

	logger.log('Finished processing');

	await Promise.all([prisma.$disconnect(), deleteByKey('/transfer-courses')]);
};

export default processJob;
