import {Test} from '@nestjs/testing';
import type {Type} from '@nestjs/common';
import type {GetTestDatabaseOptions} from './get-test-database';
import {getTestDatabase} from './get-test-database';
import {FakeFetcherService} from './fetcher-fake';
import {FetcherModule} from '~/fetcher/fetcher.module';
import {FetcherService} from '~/fetcher/fetcher.service';
import {PrismaModule} from '~/prisma/prisma.module';
import {PrismaService} from '~/prisma/prisma.service';
import {CacheModule} from '~/cache/cache.module';

type UnwrapNestType<T> = T extends Type<infer U> ? U : never;

/**
 * Get a test fixture for the provided service.
 * Tests must be run in serial because Prisma relies on an environment variable.
 */
export const getTestService = async <T extends Type>(service: T, seedOptions: GetTestDatabaseOptions = {}) => {
	const {connectionString} = await getTestDatabase(seedOptions);
	process.env.DATABASE_URL = connectionString;

	const fetcherFake = new FakeFetcherService();

	const module = await Test.createTestingModule({
		imports: [FetcherModule, PrismaModule, CacheModule],
		providers: [service]
	})
		.overrideProvider(FetcherService)
		.useValue(fetcherFake)
		.compile();

	const compiledService: UnwrapNestType<T> = module.get(service);
	const prisma = module.get(PrismaService);

	return {
		service: compiledService,
		fetcherFake,
		prisma
	};
};
