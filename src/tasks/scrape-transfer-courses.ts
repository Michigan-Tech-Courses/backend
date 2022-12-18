import {Injectable, Logger} from '@nestjs/common';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import type {ITransferCourse} from '@mtucourses/scraper';
import {FetcherService} from '~/fetcher/fetcher.service';
import {PoolService} from '~/pool/pool.service';
import {updateUpdatedAtForUpsert} from '~/lib/db-utils';

@Injectable()
@Task('scrape-transfer-courses')
export class ScrapeTransferCoursesTask {
	private readonly logger = new Logger(ScrapeTransferCoursesTask.name);

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler() {
		const extTransferCourses = await this.fetcher.getAllTransferCourses();

		// Filter out duplicates
		// todo: this should be handled by the scraper
		const extUniqueTransferCoursesMap = new Map<string, ITransferCourse>();

		for (const course of extTransferCourses) {
			const key = `${course.from.college}-${course.from.crse}-${course.from.subject}-${course.to.crse}-${course.to.subject}-${course.to.credits}`;

			if (!extUniqueTransferCoursesMap.has(key)) {
				extUniqueTransferCoursesMap.set(key, course);
			}
		}

		const extUniqueTransferCourses = Array.from(extUniqueTransferCoursesMap.values());

		this.logger.log(`Scraped ${extTransferCourses.length} transfer courses (${extUniqueTransferCourses.length} unique ones)...`);

		await db.serializable(this.pool, async trx => {
			await db.sql`ALTER TABLE ${'TransferCourse'} ADD was_seen boolean DEFAULT false`.run(trx);

			// Batch updates
			for (let i = 0; i <= extUniqueTransferCourses.length; i += 100) {
				// eslint-disable-next-line no-await-in-loop
				await db.upsert(
					'TransferCourse',
					extUniqueTransferCourses.slice(i, i + 100).map(course => ({
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
						updateValues: updateUpdatedAtForUpsert('TransferCourse', ['fromCredits', 'toCredits', 'title']),
					}
				).run(trx);
			}

			await db.sql`DELETE FROM ${'TransferCourse'} WHERE was_seen = false`.run(trx);

			await db.sql`ALTER TABLE ${'TransferCourse'} DROP was_seen`.run(trx);
		});
	}
}
