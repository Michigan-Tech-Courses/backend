import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {ScrapeInstructorsTask} from '~/tasks/scrape-instructors';

test.serial('scrapes successfully', async t => {
	const {prisma, service} = await getTestService(ScrapeInstructorsTask);

	await service.handler();

	const instructors = await prisma.instructor.findMany();
	t.is(instructors.length, 1);
});

test.serial('does not update if unchanged', async t => {
	const {prisma, service} = await getTestService(ScrapeInstructorsTask);

	await service.handler();

	const instructor = await prisma.instructor.findFirstOrThrow();

	await service.handler();

	t.is(instructor.updatedAt.getTime(), (await prisma.instructor.findFirstOrThrow()).updatedAt.getTime());
});

test.serial('updates if changed', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeInstructorsTask);

	await service.handler();

	const instructor = await prisma.instructor.findFirstOrThrow();

	fetcherFake.instructors = fetcherFake.instructors.map(i => ({
		...i,
		photoURL: 'http://url-to-new-photo'
	}));

	await service.handler();

	t.not(instructor.updatedAt.getTime(), (await prisma.instructor.findFirstOrThrow()).updatedAt.getTime());
});
