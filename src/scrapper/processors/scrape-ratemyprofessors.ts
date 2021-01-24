import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import pLimit from 'p-limit';
import ratings from '@mtucourses/rate-my-professors';
import equal from 'deep-equal';
import remap from 'src/lib/remap';

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: rate my professors scrape');

	logger.log('Started processing...');

	const limit = pLimit(10);

	const prisma = new PrismaClient();
	await prisma.$connect();

	const instructors = await prisma.instructor.findMany();

	await Promise.all(instructors.map(async instructor => limit(async () => {
		const results = await ratings.searchTeacher(`mtu ${instructor.fullName}`);

		if (results.length > 0) {
			const rmp = await ratings.getTeacher(results[0].id);

			const storedRating = {
				averageDifficultyRating: instructor.averageDifficultyRating,
				averageRating: instructor.averageRating,
				numRatings: instructor.numRatings,
				rmpId: instructor.rmpId
			};

			const newRating = {
				averageDifficultyRating: remap(rmp.avgDifficulty, 0, 5, 0, 1),
				averageRating: remap(rmp.avgRating, 0, 5, 0, 1),
				numRatings: rmp.numRatings,
				rmpId: rmp.id
			};

			if (!equal(storedRating, newRating)) {
				await prisma.instructor.update({
					where: {
						id: instructor.id
					},
					data: newRating
				});
			}
		}
	})));

	logger.log('Finished processing');

	cb(null, null);
};

export default processJob;
