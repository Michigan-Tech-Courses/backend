import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {ScrapeTransferCoursesTask} from '~/tasks/scrape-transfer-courses';

test.serial('scrapes successfully', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeTransferCoursesTask);

	await service.handler();

	const [extensionTransferCourse] = fetcherFake.transferCourses;

	const transferCourse = await prisma.transferCourse.findFirstOrThrow();

	t.like(transferCourse, {
		fromCollege: extensionTransferCourse.from.college,
		fromCollegeState: extensionTransferCourse.from.state,
		fromCRSE: extensionTransferCourse.from.crse,
		fromSubject: extensionTransferCourse.from.subject,
		fromCredits: extensionTransferCourse.from.credits,
		toCRSE: extensionTransferCourse.to.crse,
		toSubject: extensionTransferCourse.to.subject,
		toCredits: extensionTransferCourse.to.credits,
		title: extensionTransferCourse.to.title,
	});
});

test.serial('updates if not equal', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeTransferCoursesTask);

	await service.handler();
	const transferCourse = await prisma.transferCourse.findFirstOrThrow();

	fetcherFake.transferCourses[0].to.title = 'foo bar';

	await service.handler();
	const updatedTransferCourse = await prisma.transferCourse.findFirstOrThrow();

	t.not(transferCourse.updatedAt.getTime(), updatedTransferCourse.updatedAt.getTime());
	t.is(updatedTransferCourse.title, 'foo bar');
});

test.serial('deletes stale transfer courses', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeTransferCoursesTask);

	await service.handler();
	t.is(await prisma.transferCourse.count(), 1);

	fetcherFake.transferCourses = [];

	await service.handler();
	t.is(await prisma.transferCourse.count(), 0);
});
