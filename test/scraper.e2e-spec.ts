import {promisify} from 'node:util';
import {Test} from '@nestjs/testing';
import type {INestApplication} from '@nestjs/common';
import {ScraperService} from 'src/scraper/scraper.service';
import {BullModule, getQueueToken} from '@codetheweb/nestjs-bull';
import type {Queue} from 'bullmq';
import * as redis from 'redis';
import delay from 'delay';

const redisClient = redis.createClient({
	port: Number.parseInt(process.env.REDIS_PORT!, 10),
	host: process.env.REDIS_HOST
});

describe('Scraper (e2e)', () => {
	let app: INestApplication;
	const fakeInstructorProcessor = jest.fn();
	const fakeRMPProcessor = jest.fn();

	const createApp = async () => {
		const connection = {
			port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
			host: process.env.REDIS_HOST ?? 'localhost'
		};

		const moduleFixture = await Test.createTestingModule({
			imports: [
				BullModule.registerQueue({
					name: 'scrape-instructors',
					processors: [fakeInstructorProcessor],
					connection
				}),
				BullModule.registerQueue({
					name: 'scrape-rmp',
					processors: [fakeRMPProcessor],
					connection
				}),
				BullModule.registerQueue({
					name: 'scrape-sections',
					processors: [fakeRMPProcessor],
					connection
				}),
				BullModule.registerQueue({
					name: 'scrape-section-details',
					processors: [fakeRMPProcessor],
					connection
				}),
				BullModule.registerQueue({
					name: 'scrape-transfer-courses',
					processors: [fakeRMPProcessor],
					connection
				})
			],
			providers: [ScraperService]
		})
			.compile();

		app = moduleFixture.createNestApplication();

		await app.init();
	};

	beforeEach(async () => {
		// Clear Redis store
		await (promisify(redisClient.flushall).bind(redisClient))();

		await createApp();
	});

	it('sets up jobs correctly', async () => {
		let queue = app.get<Queue>(getQueueToken('scrape-instructors'));

		const initialScrapeJob = await queue.getJob('1');
		const repeatingScrapeJob = await queue.getRepeatableJobs();

		// Expect jobs were added
		expect(initialScrapeJob).toBeDefined();
		expect(repeatingScrapeJob.length).toEqual(1);

		await delay(100); // Have some fudge

		expect(fakeInstructorProcessor).toBeCalledTimes(1);

		// Restart app
		fakeInstructorProcessor.mockReset();
		await app.close();
		await createApp();

		// Get reference to queue again
		queue = app.get<Queue>(getQueueToken('scrape-instructors'));

		await delay(100); // Have some fudge

		expect(fakeInstructorProcessor).toBeCalledTimes(0);
	});

	afterAll(async () => {
		// https://stackoverflow.com/a/54560610/2129808
		await new Promise<void>(resolve => {
			redisClient.quit(() => {
				resolve();
			});
		});
		// eslint-disable-next-line no-promise-executor-return
		await new Promise(resolve => setImmediate(resolve));

		await app.close();
	});
});
