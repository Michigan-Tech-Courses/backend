import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectQueue} from '@codetheweb/nestjs-bull';
import {Queue} from 'bullmq';

@Injectable()
export class ScraperService implements OnModuleInit {
	constructor(
		@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue,
		@InjectQueue('scrape-rmp') private readonly scrapeRMPQueue: Queue,
		@InjectQueue('scrape-sections') private readonly scrapeSectionsQueue: Queue,
		@InjectQueue('scrape-section-details') private readonly scrapeSectionDetailsQueue: Queue
	) {}

	async onModuleInit() {
		// Add jobs

		// Instructor scrape

		// Run immediately if job doesn't exist
		await this.scrapeInstructorQueue.add('initial-scrape', null, {
			jobId: '1'
		});

		// Add recurring job
		await this.scrapeInstructorQueue.add('recurring-scrape', null, {
			repeat: {
				every: 10 * 60 * 1000 // 10 minutes
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
				every: 2 * 60 * 60 * 1000 // 2 hours
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
				every: 5 * 60 * 1000 // 5 minutes
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
				every: 60 * 60 * 1000 // 1 hour
			}
		});
	}
}
