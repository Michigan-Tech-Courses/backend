import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectQueue} from '@codetheweb/nestjs-bull';
import {Queue} from 'bullmq';
import {setQueues, BullMQAdapter} from 'bull-board';

@Injectable()
export class ScraperService implements OnModuleInit {
	constructor(
		@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue,
		@InjectQueue('scrape-rmp') private readonly scrapeRMPQueue: Queue,
		@InjectQueue('scrape-sections') private readonly scrapeSectionsQueue: Queue,
		@InjectQueue('scrape-section-details') private readonly scrapeSectionDetailsQueue: Queue,
		@InjectQueue('scrape-transfer-courses') private readonly scrapeTransferCoursesQueue: Queue
	) {}

	async onModuleInit() {
		// Bull UI
		setQueues([
			new BullMQAdapter(this.scrapeInstructorQueue, {readOnlyMode: true}),
			new BullMQAdapter(this.scrapeRMPQueue, {readOnlyMode: true}),
			new BullMQAdapter(this.scrapeSectionsQueue, {readOnlyMode: true}),
			new BullMQAdapter(this.scrapeSectionDetailsQueue, {readOnlyMode: true}),
			new BullMQAdapter(this.scrapeTransferCoursesQueue, {readOnlyMode: true})
		]);

		// Add jobs
		// Schedules are attempted to be slightly offseted to limit concurrent load

		// Instructor scrape

		// Run immediately if job doesn't exist
		await this.scrapeInstructorQueue.add('initial-scrape', null, {
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeInstructorQueue.add('recurring-scrape', null, {
			repeat: {
				cron: '10 * * * *' // Xx:10 (every hour)
			},
			jobId: '2'
		});

		// Rate My Professors scrape

		// Run immediately if job doesn't exist
		await this.scrapeRMPQueue.add('initial-scrape', null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeRMPQueue.add('recurring-scrape', null, {
			jobId: '2', // Prevents adding multiple of the same job
			repeat: {
				cron: '20 */2 * * *' // (xx % 2 == 0):20 (every 2 hours)
			}
		});

		// Course sections scrape
		// Run immediately if job doesn't exist
		await this.scrapeSectionsQueue.add('initial-scrape', null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeSectionsQueue.add('recurring-scrape', null, {
			jobId: '2', // Prevents adding multiple of the same job
			repeat: {
				cron: '*/6 * * * *' // Every 6 minutes
			}
		});

		// Course section details scrape
		// Fetches instructors and course description
		// Run immediately if job doesn't exist
		await this.scrapeSectionDetailsQueue.add('initial-scrape', null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeSectionDetailsQueue.add('recurring-scrape', null, {
			jobId: '2', // Prevents adding multiple of the same job
			repeat: {
				cron: '40 * * * *' // Xx:40 (every hour)
			}
		});

		// Course section details scrape
		// Fetches instructors and course description
		// Run immediately if job doesn't exist
		await this.scrapeTransferCoursesQueue.add('initial-scrape', null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeTransferCoursesQueue.add('recurring-scrape', null, {
			jobId: '2', // Prevents adding multiple of the same job
			repeat: {
				cron: '45 * * * *' // Xx:45 (every hour)
			}
		});
	}
}
