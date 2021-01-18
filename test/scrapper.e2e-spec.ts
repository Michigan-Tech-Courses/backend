import {Test} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import {ScrapperService} from 'src/scrapper/scrapper.service';
import {BullModule, getQueueToken} from '@nestjs/bull';
import {Queue} from 'bull';
import {promisify} from 'util';
import * as redis from 'redis';
import delay from 'delay';

const redisClient = redis.createClient();

describe('Scrapper (e2e)', () => {
	let app: INestApplication;
	const fakeProcessor = jest.fn();

	const createApp = async () => {
		const moduleFixture = await Test.createTestingModule({
			imports: [
				BullModule.registerQueue({
					name: 'scrape-instructors',
					processors: [fakeProcessor]
				})
			],
			providers: [ScrapperService]
		})
			.compile();

		app = moduleFixture.createNestApplication();

		await app.init();
	};

	beforeEach(async () => {
		// Clear Redis store
		await (promisify(redisClient.flushall).bind(redisClient))('ASYNC');

		await createApp();
	});

	it('sets up jobs correctly', async () => {
		await app.init();

		let queue = app.get<Queue>(getQueueToken('scrape-instructors'));

		const initialScrapeJob = await queue.getJob(1);
		const repeatingScrapeJob = await queue.getJob(2);

		// Expect jobs were added
		expect(initialScrapeJob).toBeDefined();
		expect(repeatingScrapeJob).toBeDefined();

		await delay(100); // Have some fudge
		await queue.whenCurrentJobsFinished();

		expect(fakeProcessor).toBeCalledTimes(1);

		// Restart app
		fakeProcessor.mockReset();
		await app.close();
		await createApp();

		// Get reference to queue again
		queue = app.get<Queue>(getQueueToken('scrape-instructors'));

		await delay(100); // Have some fudge
		await queue.whenCurrentJobsFinished();

		expect(fakeProcessor).toBeCalledTimes(0);
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
