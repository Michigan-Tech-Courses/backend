import {join} from 'node:path';
import type {MiddlewareConsumer, NestModule} from '@nestjs/common';
import {Module, Injectable} from '@nestjs/common';
import {BullModule, InjectQueue} from '@codetheweb/nestjs-bull';
import {Queue} from 'bullmq';
import {createBullBoard} from '@bull-board/api';
import {BullMQAdapter} from '@bull-board/api/bullMQAdapter';
import {ExpressAdapter} from '@bull-board/express';
import {ScraperService} from './scraper.service';

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
	providers: [ScraperService],
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
}
