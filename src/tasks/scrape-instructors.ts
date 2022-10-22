import {Injectable, Logger} from '@nestjs/common';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import {FetcherService} from 'src/fetcher/fetcher.service';
import {PoolService} from '~/pool/pool.service';

@Injectable()
@Task('scrape-instructors')
export class ScrapeInstructorsTask {
	private readonly logger = new Logger(ScrapeInstructorsTask.name);

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler() {
		const faculty = await this.fetcher.getAllFaculty();

		this.logger.log('Finished scraping website');

		await db.serializable(this.pool, async trx => {
			await db.update('Instructor', {
				deletedAt: db.sql`now()`,
			}, {}).run(trx);

			await db.upsert('Instructor', faculty.map(f => ({
				fullName: f.name,
				departments: f.departments,
				email: f.email,
				phone: f.phone,
				office: f.office,
				websiteURL: f.websiteURL,
				interests: f.interests,
				occupations: f.occupations,
				photoURL: f.photoURL,
			})), ['fullName'], {
				updateValues: {
					deletedAt: db.sql`null`,
					updatedAt: db.sql`
						CASE WHEN (
							"Instructor"."fullName",
							"Instructor"."departments",
							"Instructor"."email",
							"Instructor"."phone",
							"Instructor"."office",
							"Instructor"."websiteURL",
							"Instructor"."interests",
							"Instructor"."occupations",
							"Instructor"."photoURL"
						) IS DISTINCT FROM (
							EXCLUDED."fullName",
							EXCLUDED."departments",
							EXCLUDED."email",
							EXCLUDED."phone",
							EXCLUDED."office",
							EXCLUDED."websiteURL",
							EXCLUDED."interests",
							EXCLUDED."occupations",
							EXCLUDED."photoURL"
						) THEN now() ELSE "Instructor"."updatedAt" END`,
				}
			}).run(trx);
		});
	}
}
