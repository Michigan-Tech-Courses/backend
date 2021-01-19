import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';

@Injectable()
export class ScrapperService implements OnModuleInit {
	constructor(@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue) {}

	async onModuleInit() {
		// Add jobs

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
	}
}
