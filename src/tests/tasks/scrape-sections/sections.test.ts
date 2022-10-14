import test from 'ava';
import { ScrapeSectionsTask } from '~/tasks/scrape-sections';
import { getTestTask } from '~/tests/fixtures/get-test-task';
import { getFirstTermFromFake } from '~/tests/fixtures/utils';

test.serial('inserts a new section', async t => {
	const {task, prisma, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
  });

  t.is(await prisma.section.count(), 0);

	await task.handler({
		terms: [getFirstTermFromFake()],
	});

  t.is(await prisma.section.count(), 1);

  const section = await prisma.section.findFirstOrThrow();
  t.like(section, {
    crn: fetcherFake.courses[0].extSections[0].crn,
    section: fetcherFake.courses[0].extSections[0].section,
    cmp: fetcherFake.courses[0].extSections[0].cmp,
    minCredits: fetcherFake.courses[0].extSections[0].creditRange[0],
    maxCredits: fetcherFake.courses[0].extSections[0].creditRange[1],
    totalSeats: fetcherFake.courses[0].extSections[0].seats,
    takenSeats: fetcherFake.courses[0].extSections[0].seatsTaken,
    availableSeats: fetcherFake.courses[0].extSections[0].seatsAvailable,
    fee: fetcherFake.courses[0].extSections[0].fee,
  })

  t.truthy(section.time)
  t.snapshot(section.time)
});

test.serial('updates an existing section', async t => {
  const {task, prisma, fetcherFake} = await getTestTask(ScrapeSectionsTask);

  await task.handler({
    terms: [getFirstTermFromFake()],
  })

  fetcherFake.putFirstSection({
    seatsTaken: 0,
    seatsAvailable: 1000,
  });

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedSection = await prisma.section.findFirstOrThrow();

  t.is(updatedSection.takenSeats, 0);
  t.is(updatedSection.availableSeats, 1000);
})

test.serial("deletes a section that doesn't exist anymore", async t => {
  const {task, prisma, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
    seedSections: true,
  });

  fetcherFake.courses[0].extSections = [];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  t.truthy((await prisma.section.findFirstOrThrow()).deletedAt);
})

test.serial("adds back a section that was deleted", async t => {
  const {task, prisma, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
    seedSections: true,
  });

  const [extSection] = fetcherFake.courses[0].extSections;

  fetcherFake.courses[0].extSections = [];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  t.truthy((await prisma.section.findFirstOrThrow()).deletedAt);

  // Add section back
  fetcherFake.courses[0].extSections = [
    extSection
  ];

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  t.falsy((await prisma.section.findFirstOrThrow()).deletedAt);
})

test.serial("doesn't update a section if nothing changed", async t => {
  const {task, prisma, fetcherFake} = await getTestTask(ScrapeSectionsTask, {
    seedCourses: true,
    seedSections: true,
  });

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const section = await prisma.section.findFirstOrThrow();

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const updatedSection = await prisma.section.findFirstOrThrow();

  t.is(section.updatedAt.getTime(), updatedSection.updatedAt.getTime());
})

test.serial("never modifies a section's location", async t => {
  const {task, prisma} = await getTestTask(ScrapeSectionsTask, {
    seedBuildings: true,
    seedCourses: true,
    seedSections: true,
  });

  await prisma.section.updateMany({
    data: {
      buildingName: 'Broomball Courts',
      room: 'baz',
    }
  })

  await task.handler({
    terms: [getFirstTermFromFake()],
  });

  const section = await prisma.section.findFirstOrThrow();

  t.is(section.buildingName, 'Broomball Courts');
  t.is(section.room, 'baz');
})
