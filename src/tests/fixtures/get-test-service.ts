import {Test} from '@nestjs/testing';
import type {Type} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {getTestDatabase, type GetTestDatabaseOptions} from './get-test-database';
import {FakeFetcherService} from './fetcher-fake';
import {FetcherModule} from '~/fetcher/fetcher.module';
import {FetcherService} from '~/fetcher/fetcher.service';
import {CacheModule} from '~/cache/cache.module';
import {PoolModule} from '~/pool/pool.module';

type UnwrapNestType<T> = T extends Type<infer U> ? U : never;

type Options = {
	shouldInjectDatabaseUrl?: boolean;
} & GetTestDatabaseOptions;

/**
 * Get a test fixture for the provided service.
 * Tests must be run in serial because Prisma relies on an environment variable.
 */
export const getTestService = async <T extends Type>(service: T, options: Options = {}) => {
	const {shouldInjectDatabaseUrl, ...seedOptions} = options;
	const {connectionString, pool} = await getTestDatabase(seedOptions);

	if (shouldInjectDatabaseUrl ?? true) {
		process.env.DATABASE_URL = connectionString;
	}

	const fetcherFake = new FakeFetcherService();

	const module = await Test.createTestingModule({
		imports: [FetcherModule, PoolModule, CacheModule],
		providers: [service]
	})
		.overrideProvider(FetcherService)
		.useValue(fetcherFake)
		.compile();

	const compiledService: UnwrapNestType<T> = module.get(service);

	return {
		service: compiledService,
		fetcherFake,
		prisma: new PrismaClient(),
		pool
	};
};
