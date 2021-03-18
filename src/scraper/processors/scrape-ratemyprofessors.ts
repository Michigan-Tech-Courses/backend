import {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import prisma from 'src/lib/prisma-singleton';
import pThrottle from 'p-throttle';
import ratings from '@mtucourses/rate-my-professors';
import equal from 'deep-equal';
import remap from 'src/lib/remap';
import {deleteByKey} from 'src/cache/store';
import {Instructor} from '@prisma/client';

const processJob = async (_: Job) => {
	const logger = new Logger('Job: rate my professors scrape');

	logger.log('Started processing...');

	const schools = await ratings.searchSchool('Michigan Technological University');

	if (schools.length === 0) {
		throw new Error('School ID could not be resolved.');
	}

	const processInstructor = pThrottle({
		limit: 2,
		interval: 100
	})(async (instructor: Instructor) => {
		const nameFragments = instructor.fullName.split(' ');
		const firstName = nameFragments[0];
		const lastName = nameFragments[nameFragments.length - 1];

		const results = await ratings.searchTeacher(`mtu ${firstName} ${lastName}`, schools[0].id);

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
	});

	await prisma.$connect();

	const instructors = await prisma.instructor.findMany();

	await Promise.all(instructors.map(async instructor => processInstructor(instructor)));

	logger.log('Finished processing');

	await deleteByKey('/instructors');
};

export default processJob;
