import test from 'ava';
import {getTestTask} from '../fixtures/get-test-task';
import {ScrapeTransferCoursesTask} from '~/tasks/scrape-transfer-courses';

test.serial('scrapes successfully', async t => {
	const {task, prisma, fetcherFake} = await getTestTask(ScrapeTransferCoursesTask);

	await task.handler();

	const [extTransferCourse] = fetcherFake.transferCourses;

	const transferCourse = await prisma.transferCourse.findFirstOrThrow();

	t.like(transferCourse, {
		fromCollege: extTransferCourse.from.college,
		fromCollegeState: extTransferCourse.from.state,
		fromCRSE: extTransferCourse.from.crse,
		fromSubject: extTransferCourse.from.subject,
		fromCredits: extTransferCourse.from.credits,
		toCRSE: extTransferCourse.to.crse,
		toSubject: extTransferCourse.to.subject,
		toCredits: extTransferCourse.to.credits,
		title: extTransferCourse.to.title,
	});
});

test.serial('doesn\'t update if nothing changed', async t => {
	const {task, prisma} = await getTestTask(ScrapeTransferCoursesTask);

	await task.handler();
	const transferCourse = await prisma.transferCourse.findFirstOrThrow();

	await task.handler();
	const transferCourse2 = await prisma.transferCourse.findFirstOrThrow();

	t.is(transferCourse.updatedAt.getTime(), transferCourse2.updatedAt.getTime());
});

test.serial('updates if not equal', async t => {
	const {task, prisma, fetcherFake} = await getTestTask(ScrapeTransferCoursesTask);

	await task.handler();
	const transferCourse = await prisma.transferCourse.findFirstOrThrow();

	fetcherFake.transferCourses[0].to.title = 'foo bar';

	await task.handler();
	const updatedTransferCourse = await prisma.transferCourse.findFirstOrThrow();

	t.not(transferCourse.updatedAt.getTime(), updatedTransferCourse.updatedAt.getTime());
	t.is(updatedTransferCourse.title, 'foo bar');
});

test.serial('deletes stale transfer courses', async t => {
	const {task, prisma, fetcherFake} = await getTestTask(ScrapeTransferCoursesTask);

	await task.handler();
	t.is(await prisma.transferCourse.count(), 1);

	fetcherFake.transferCourses = [];

	await task.handler();
	t.is(await prisma.transferCourse.count(), 0);
});
