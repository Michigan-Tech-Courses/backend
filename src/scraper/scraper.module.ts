import {Module, Injectable, MiddlewareConsumer, NestModule} from '@nestjs/common';
import {BullModule, InjectQueue} from '@codetheweb/nestjs-bull';
import {join} from 'path';
import {Queue} from 'bullmq';
import {createBullBoard} from '@bull-board/api';
import {BullMQAdapter} from '@bull-board/api/bullMQAdapter';
import {ExpressAdapter} from '@bull-board/express';

const DISABLE_PROCESSORS = process.env.DISABLE_PROCESSORS === 'true';

const ifProcessorsEnabled = (paths: string[]) => {
	if (DISABLE_PROCESSORS) {
		return [];
	}

	return paths;
};

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'scrape-instructors',
			processors: ifProcessorsEnabled([join(__dirname, 'processors/scrape-instructors.js')])
		}),
		BullModule.registerQueue({
			name: 'scrape-rmp',
			processors: ifProcessorsEnabled([join(__dirname, 'processors/scrape-ratemyprofessors.js')])
		}),
		BullModule.registerQueue({
			name: 'scrape-sections',
			processors: ifProcessorsEnabled([join(__dirname, 'processors/scrape-sections.js')])
		}),
		BullModule.registerQueue({
			name: 'scrape-section-details',
			processors: ifProcessorsEnabled([join(__dirname, 'processors/scrape-section-details.js')])
		}),
		BullModule.registerQueue({
			name: 'scrape-transfer-courses',
			processors: ifProcessorsEnabled([join(__dirname, 'processors/scrape-transfer-courses.js')])
		})
	],
	controllers: [],
	providers: [],
	exports: []
})

@Injectable()
export class ScraperModule implements NestModule {
	constructor(
		@InjectQueue('scrape-instructors') private readonly scrapeInstructorQueue: Queue,
		@InjectQueue('scrape-rmp') private readonly scrapeRMPQueue: Queue,
		@InjectQueue('scrape-sections') private readonly scrapeSectionsQueue: Queue,
		@InjectQueue('scrape-section-details') private readonly scrapeSectionDetailsQueue: Queue,
		@InjectQueue('scrape-transfer-courses') private readonly scrapeTransferCoursesQueue: Queue
	) {}

	configure(consumer: MiddlewareConsumer) {
		// Bull UI
		const serverAdapter = new ExpressAdapter();

		createBullBoard({
			queues: [
				new BullMQAdapter(this.scrapeInstructorQueue, {readOnlyMode: true}),
				new BullMQAdapter(this.scrapeRMPQueue, {readOnlyMode: true}),
				new BullMQAdapter(this.scrapeSectionsQueue, {readOnlyMode: true}),
				new BullMQAdapter(this.scrapeSectionDetailsQueue, {readOnlyMode: true}),
				new BullMQAdapter(this.scrapeTransferCoursesQueue, {readOnlyMode: true})
			],
			serverAdapter
		});

		serverAdapter.setBasePath('/queues');
		consumer.apply(serverAdapter.getRouter()).forRoutes('/queues');
	}

	async onModuleInit() {
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
