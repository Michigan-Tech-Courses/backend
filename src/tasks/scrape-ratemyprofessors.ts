import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import ratings from '@mtucourses/rate-my-professors';
import equal from 'deep-equal';
import remap from 'src/lib/remap';
import type {Instructor} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {Task, TaskHandler} from 'nestjs-graphile-worker';

@Injectable()
@Task('scrape-rate-my-professors')
export class ScrapeRateMyProfessorsTask {
	private readonly logger = new Logger(ScrapeRateMyProfessorsTask.name);

	constructor(private readonly prisma: PrismaService) {}

	@TaskHandler()
	async handler() {
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

			const results = await ratings.searchTeacher(`${firstName} ${lastName}`, schools[0].id);

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
					await this.prisma.instructor.update({
						where: {
							id: instructor.id
						},
						data: newRating
					});
				}
			}
		});

		const instructors = await this.prisma.instructor.findMany();

		await Promise.all(instructors.map(async instructor => processInstructor(instructor)));
	}
}
