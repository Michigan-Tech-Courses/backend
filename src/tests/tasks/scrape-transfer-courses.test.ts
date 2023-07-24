import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {ScrapeTransferCoursesTask} from '~/tasks/scrape-transfer-courses';

test.serial('scrapes successfully', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeTransferCoursesTask);

	await service.handler();

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
