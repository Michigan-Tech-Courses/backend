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

	const updatedInstructor = await prisma.instructor.findFirstOrThrow();

	t.is(instructor.updatedAt.getTime(), updatedInstructor.updatedAt.getTime());
	t.falsy(updatedInstructor.deletedAt);
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

	const updatedInstructor = await prisma.instructor.findFirstOrThrow();

	t.not(instructor.updatedAt.getTime(), updatedInstructor.updatedAt.getTime());
	t.falsy(updatedInstructor.deletedAt);
});

test.serial('deletes if not in scrape', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeInstructorsTask);

	await service.handler();

	fetcherFake.instructors = [];

	await service.handler();

	const instructor = await prisma.instructor.findFirstOrThrow();
	t.truthy(instructor.deletedAt);
});

test.serial('works with multiple instructors', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeInstructorsTask);

	await service.handler();

	fetcherFake.instructors.push({
		...fetcherFake.instructors[0],
		name: 'Instructor 2',
	});

	await service.handler();

	const instructors = await prisma.instructor.findMany();
	t.is(instructors.length, 2);
});
