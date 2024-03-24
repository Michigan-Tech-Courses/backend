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
		let extensionTransferCourses: ITransferCourse[] = [];
		try {
			extensionTransferCourses = await this.fetcher.getAllTransferCourses();
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'Banner services are currently down.') {
				this.logger.warn('Banner services are currently down. Skipping scraping instructors.');
				return;
			}
		}

		// Filter out duplicates
		// todo: this should be handled by the scraper
		const extensionUniqueTransferCoursesMap = new Map<string, ITransferCourse>();

		for (const course of extensionTransferCourses) {
			const key = `${course.from.college}-${course.from.crse}-${course.from.subject}-${course.to.crse}-${course.to.subject}-${course.to.credits}`;

			if (!extensionUniqueTransferCoursesMap.has(key)) {
				extensionUniqueTransferCoursesMap.set(key, course);
			}
		}

		const extensionUniqueTransferCourses = Array.from(extensionUniqueTransferCoursesMap.values());

		this.logger.log(`Scraped ${extensionTransferCourses.length} transfer courses (${extensionUniqueTransferCourses.length} unique ones)...`);

		const startedUpdatingAt = new Date();
		await db.serializable(this.pool, async trx => {
			// Batch updates
			for (let i = 0; i <= extensionUniqueTransferCourses.length; i += 100) {
				// eslint-disable-next-line no-await-in-loop
				await db.upsert(
					'TransferCourse',
					extensionUniqueTransferCourses.slice(i, i + 100).map(course => ({
						fromCollege: course.from.college,
						fromCollegeState: course.from.state,
						fromCRSE: course.from.crse,
						fromCredits: course.from.credits,
						fromSubject: course.from.subject,
						toCRSE: course.to.crse,
						toCredits: course.to.credits,
						toSubject: course.to.subject,
						title: course.to.title,
						updatedAt: new Date(),
					})),
					['fromCollege', 'fromCRSE', 'fromSubject', 'toCRSE', 'toSubject', 'toCredits'],
					{
						updateValues: updateUpdatedAtForUpsert('TransferCourse', ['fromCredits', 'toCredits', 'title', 'updatedAt']),
					}
				).run(trx);
			}

			await db.deletes('TransferCourse', {
				updatedAt: db.conditions.lt(startedUpdatingAt),
			}).run(trx);
		});
	}
}
