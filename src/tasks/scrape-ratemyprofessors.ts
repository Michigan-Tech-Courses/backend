import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import equal from 'deep-equal';
import pRetry from 'p-retry';
import remap from 'src/lib/remap';
import * as db from 'zapatos/db';
import type * as schema from 'zapatos/schema';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import {FetcherService} from '~/fetcher/fetcher.service';
import {PoolService} from '~/pool/pool.service';

@Injectable()
@Task('scrape-rate-my-professors')
export class ScrapeRateMyProfessorsTask {
	private readonly logger = new Logger(ScrapeRateMyProfessorsTask.name);

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler() {
		const schools = await pRetry(async () => {
			const schools = await this.fetcher.rateMyProfessors.searchSchool('Michigan Technological University');

			if (schools.length === 0) {
				throw new Error('School ID could not be resolved.');
			}

			return schools;
		}, {
			retries: 5
		});

		// Todo: make this faster with transactions
		const processInstructor = pThrottle({
			limit: 2,
			interval: 256
		})(async (instructor: schema.JSONSelectableForTable<'Instructor'>) => {
			const nameFragments = instructor.fullName.split(' ');
			const firstName = nameFragments[0];
			const lastName = nameFragments.at(-1);

			const results = await this.fetcher.rateMyProfessors.searchTeacher(`${firstName} ${lastName}`, schools[0].id);

			if (results.length > 0) {
				const rmp = await this.fetcher.rateMyProfessors.getTeacher(results[0].id);

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
					await db.update('Instructor', {
						averageDifficultyRating: newRating.averageDifficultyRating,
						averageRating: newRating.averageRating,
						numRatings: newRating.numRatings,
						rmpId: newRating.rmpId,
						updatedAt: new Date()
					}, {
						id: instructor.id,
					}).run(this.pool);
				}
			}
		});

		const instructors = await db.select('Instructor', db.all).run(this.pool);

		await Promise.all(instructors.map(async instructor => processInstructor(instructor)));
	}
}
