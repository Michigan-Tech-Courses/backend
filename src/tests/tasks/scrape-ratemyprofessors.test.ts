import type {PrismaClient} from '@prisma/client';
import test from 'ava';
import type {FakeFetcherService} from '../fixtures/fetcher-fake';
import {getTestService} from '../fixtures/get-test-service';
import {ScrapeRateMyProfessorsTask} from '~/tasks/scrape-ratemyprofessors';

const seedInstructor = async (prisma: PrismaClient, fetcherFake: FakeFetcherService) => {
	await prisma.instructor.create({
		data: {
			fullName: `${fetcherFake.instructors[0].name}`,
		}
	});
};

test.serial('scrapes successfully', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeRateMyProfessorsTask);

	await seedInstructor(prisma, fetcherFake);

	await service.handler();

	const updatedInstructor = await prisma.instructor.findFirstOrThrow();

	t.is(updatedInstructor.averageDifficultyRating, fetcherFake.rateMyProfessors.teachers[0].avgDifficulty / 5);
	t.is(updatedInstructor.averageRating, fetcherFake.rateMyProfessors.teachers[0].avgRating / 5);
	t.is(updatedInstructor.numRatings, fetcherFake.rateMyProfessors.teachers[0].numRatings);
});

test.serial('updates if changed', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeRateMyProfessorsTask);
	await seedInstructor(prisma, fetcherFake);

	await service.handler();
	const originalInstructor = await prisma.instructor.findFirstOrThrow();

	fetcherFake.rateMyProfessors.teachers = fetcherFake.rateMyProfessors.teachers.map(i => ({
		...i,
		avgDifficulty: 1,
		avgRating: 1,
		numRatings: 1
	}));

	await service.handler();
	const updatedInstructor = await prisma.instructor.findFirstOrThrow();

	t.not(originalInstructor.updatedAt.getTime(), updatedInstructor.updatedAt.getTime());

	t.is(updatedInstructor.averageDifficultyRating, 1 / 5);
	t.is(updatedInstructor.averageRating, 1 / 5);
	t.is(updatedInstructor.numRatings, 1);
});

test.serial('doesn\'t update if unchanged', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeRateMyProfessorsTask);
	await seedInstructor(prisma, fetcherFake);

	await service.handler();
	const originalInstructor = await prisma.instructor.findFirstOrThrow();

	await service.handler();
	const updatedInstructor = await prisma.instructor.findFirstOrThrow();

	t.is(originalInstructor.updatedAt.getTime(), updatedInstructor.updatedAt.getTime());
});
