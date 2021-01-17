import {Injectable, OnModuleInit} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bull';
import {Queue} from 'bull';

@Injectable()
export class ScrapperService implements OnModuleInit {
	constructor(@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue) {}

	async onModuleInit() {
		// Add jobs
		const jobsInQueue = await this.scrapeInstructorQueue.count();

		// Run immediately if job doesn't exist
		if (jobsInQueue === 0) {
			await this.scrapeInstructorQueue.add(null, {
				jobId: 'scrape-instructors', // Prevents adding multiple of the same job
				repeat: false
			});
		}

		// Add recurring job
		await this.scrapeInstructorQueue.add(null, {
			jobId: 'scrape-instructors', // Prevents adding multiple of the same job
			repeat: {
				every: 10 * 60 * 1000 // 10 minutes
			}
		});
	}
}
