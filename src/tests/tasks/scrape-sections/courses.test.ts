import test from 'ava';
import { ScrapeSectionsTask } from '~/tasks/scrape-sections';
import { getTestTask } from '~/tests/fixtures/get-test-task';
import { getFirstTermFromFake } from '~/tests/fixtures/utils';

test.serial('scrapes successfully', async t => {
	const {task} = await getTestTask(ScrapeSectionsTask);

	await task.handler({
		terms: [getFirstTermFromFake()],
	});

	t.pass();
});

test.serial("inserts a new course", async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask);

  t.is(await prisma.course.count(), 0);

	await task.handler({
		terms: [getFirstTermFromFake()],
	});

  t.is(await prisma.course.count(), 1);

  const course = await prisma.course.findFirstOrThrow();

  t.like(course, {
    year: fetcherFake.courses[0].year,
    semester: fetcherFake.courses[0].semester,
    subject: fetcherFake.courses[0].extCourse.subject,
    crse: fetcherFake.courses[0].extCourse.crse,
    title: fetcherFake.courses[0].extCourse.title,
    minCredits: fetcherFake.courses[0].extSections[0].creditRange[0],
    maxCredits: fetcherFake.courses[0].extSections[0].creditRange[1],
  })
})

test.serial("updates the title of an existing course", async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  fetcherFake.putFirstCourse({
    title: "New Title",
  });

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedCourse = await prisma.course.findFirstOrThrow();

  t.is(updatedCourse.title, "New Title");
})

test.serial('updates credits of an existing course', async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  fetcherFake.putFirstSection({
        creditRange: [10, 20],
  });

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedCourse = await prisma.course.findFirstOrThrow();

  t.is(updatedCourse.minCredits, 10);
  t.is(updatedCourse.maxCredits, 20);
})

test.serial("deletes a course if it's missing in scraped data" ,async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  fetcherFake.courses = [];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const course = await prisma.course.findFirstOrThrow();

  t.truthy(course.deletedAt)
})

test.serial('adds back a course that was previously deleted', async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  const [course] = fetcherFake.courses

  fetcherFake.courses = [];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  t.truthy((await prisma.course.findFirstOrThrow()).deletedAt);

  // Add back course
  fetcherFake.courses = [course];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  t.falsy((await prisma.course.findFirstOrThrow()).deletedAt);
})

test.serial("doesn't modify a course if nothing changed", async t => {
  const {prisma, task} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const course = await prisma.course.findFirstOrThrow();

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedCourse = await prisma.course.findFirstOrThrow();

  t.is(course.updatedAt.getTime(), updatedCourse.updatedAt.getTime());
})

test.serial("doesn't modify a deleted course if nothing changed", async t => {
  const {prisma, task, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  fetcherFake.courses = [];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const course = await prisma.course.findFirstOrThrow();
  t.truthy(course.deletedAt)

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedCourse = await prisma.course.findFirstOrThrow();

  t.is(course.updatedAt.getTime(), updatedCourse.updatedAt.getTime());
})
