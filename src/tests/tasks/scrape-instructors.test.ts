import test from 'ava';
import {getTestTask} from '../fixtures/get-test-task';
import {ScrapeInstructorsTask} from '~/tasks/scrape-instructors';

test.serial('scrapes successfully', async t => {
	const {prisma, task} = await getTestTask(ScrapeInstructorsTask);

	await task.handler();

	const instructors = await prisma.instructor.findMany();
	t.is(instructors.length, 1);
});

test.serial('does not update if unchanged', async t => {
	const {prisma, task} = await getTestTask(ScrapeInstructorsTask);

	await task.handler();

	const instructor = await prisma.instructor.findFirstOrThrow();

	await task.handler();

	t.is(instructor.updatedAt.getTime(), (await prisma.instructor.findFirstOrThrow()).updatedAt.getTime());
});

test.serial('updates if changed', async t => {
	const {prisma, task, fetcherFake} = await getTestTask(ScrapeInstructorsTask);

	await task.handler();

	const instructor = await prisma.instructor.findFirstOrThrow();

	fetcherFake.instructors = fetcherFake.instructors.map(i => ({
		...i,
		photoURL: 'http://url-to-new-photo'
	}));

	await task.handler();

	t.not(instructor.updatedAt.getTime(), (await prisma.instructor.findFirstOrThrow()).updatedAt.getTime());
});
