import {Injectable, Logger} from '@nestjs/common';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import {FetcherService} from 'src/fetcher/fetcher.service';
import type {IFaculty} from '@mtucourses/scraper';
import {PoolService} from '~/pool/pool.service';
import {updateDeletedAtUpdatedAtForUpsert} from '~/lib/db-utils';

@Injectable()
@Task('scrape-instructors')
export class ScrapeInstructorsTask {
	private readonly logger = new Logger(ScrapeInstructorsTask.name);

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler() {
		let faculty: IFaculty[] = [];
		try {
			faculty = await this.fetcher.getAllFaculty();
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'Banner services are currently down.') {
				this.logger.warn('Banner services are currently down. Skipping scraping instructors.');
				return;
			}
		}

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
				updateValues: updateDeletedAtUpdatedAtForUpsert('Instructor', [
					'fullName',
					'departments',
					'email',
					'phone',
					'office',
					'websiteURL',
					'interests',
					'occupations',
					'photoURL',
				])
			}).run(trx);
		});
	}
}
