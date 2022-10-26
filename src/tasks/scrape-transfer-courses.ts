import {Injectable} from '@nestjs/common';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import {FetcherService} from '~/fetcher/fetcher.service';
import {PoolService} from '~/pool/pool.service';
import {updateUpdatedAtForUpsert} from '~/lib/db-utils';

@Injectable()
@Task('scrape-transfer-courses')
export class ScrapeTransferCoursesTask {
	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler() {
		const extTransferCourses = await this.fetcher.getAllTransferCourses();

		await db.serializable(this.pool, async trx => {
			await db.sql`ALTER TABLE ${'TransferCourse'} ADD was_seen boolean DEFAULT false`.run(trx);

			await db.upsert(
				'TransferCourse',
				extTransferCourses.map(course => ({
					fromCollege: course.from.college,
					fromCollegeState: course.from.state,
					fromCRSE: course.from.crse,
					fromCredits: course.from.credits,
					fromSubject: course.from.subject,
					toCRSE: course.to.crse,
					toCredits: course.to.credits,
					toSubject: course.to.subject,
					title: course.to.title,
					was_seen: true,
				})),
				['fromCollege', 'fromCRSE', 'fromSubject', 'toCRSE', 'toSubject', 'toCredits'],
				{
					updateValues: updateUpdatedAtForUpsert('TransferCourse', ['fromCredits', 'toCredits', 'title'])
				}
			).run(trx);

			await db.sql`DELETE FROM ${'TransferCourse'} WHERE was_seen = false`.run(trx);

			await db.sql`ALTER TABLE ${'TransferCourse'} DROP was_seen`.run(trx);
		});
	}
}
