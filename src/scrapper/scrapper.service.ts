import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';

@Injectable()
export class ScrapperService implements OnModuleInit {
	constructor(
		@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue,
		@InjectQueue('scrape-rmp') private readonly scrapeRMPQueue: Queue
	) {}

	async onModuleInit() {
		// Add jobs

		// Instructor scrape
		// Run immediately if job doesn't exist
		await this.scrapeInstructorQueue.add(null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: 1,
			repeat: false
		});

		// Add recurring job
		await this.scrapeInstructorQueue.add(null, {
			jobId: 2, // Prevents adding multiple of the same job
			repeat: {
				every: 10 * 60 * 1000 // 10 minutes
			}
		});

		// Rate My Professors scrape
		// Run immediately if job doesn't exist
		await this.scrapeRMPQueue.add(null, {
			// Because we pass a job ID, this will only run if it hasn't run before
			jobId: 1,
			repeat: false
		});

		// Add recurring job
		await this.scrapeRMPQueue.add(null, {
			jobId: 2, // Prevents adding multiple of the same job
			repeat: {
				every: 2 * 60 * 60 * 1000 // 2 hours
			}
		});
	}
}
