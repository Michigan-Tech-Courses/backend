import test from 'ava';
import {ScrapeSectionsTask} from '~/tasks/scrape-sections';
import {getTestService} from '~/tests/fixtures/get-test-service';
import {getFirstTermFromFake} from '~/tests/fixtures/utils';

test.serial('inserts a new section', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeSectionsTask, {
		seedCourses: true,
	});

	t.is(await prisma.section.count(), 0);

	await service.handler({
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
	});

	t.truthy(section.time);
	t.snapshot(section.time);
});

test.serial('updates an existing section', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeSectionsTask);

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	fetcherFake.putFirstSection({
		seatsTaken: 0,
		seatsAvailable: 1000,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow();

	t.is(updatedSection.takenSeats, 0);
	t.is(updatedSection.availableSeats, 1000);
});

test.serial('deletes a section that doesn\'t exist anymore', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeSectionsTask, {
		seedCourses: true,
		seedSections: true,
	});

	fetcherFake.courses[0].extSections = [];

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	t.truthy((await prisma.section.findFirstOrThrow()).deletedAt);
});

test.serial('adds back a section that was deleted', async t => {
	const {service, prisma, fetcherFake} = await getTestService(ScrapeSectionsTask, {
		seedCourses: true,
		seedSections: true,
	});

	const [extensionSection] = fetcherFake.courses[0].extSections;

	fetcherFake.courses[0].extSections = [];

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	t.truthy((await prisma.section.findFirstOrThrow()).deletedAt);

	// Add section back
	fetcherFake.courses[0].extSections = [
		extensionSection
	];

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	t.falsy((await prisma.section.findFirstOrThrow()).deletedAt);
});

test.serial('doesn\'t update a section if nothing changed', async t => {
	const {service, prisma} = await getTestService(ScrapeSectionsTask, {
		seedCourses: true,
		seedSections: true,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const section = await prisma.section.findFirstOrThrow();

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow();

	t.is(section.updatedAt.getTime(), updatedSection.updatedAt.getTime());
});

test.serial('never modifies a section\'s location', async t => {
	const {service, prisma} = await getTestService(ScrapeSectionsTask, {
		seedBuildings: true,
		seedCourses: true,
		seedSections: true,
	});

	await prisma.section.updateMany({
		data: {
			buildingName: 'Broomball Courts',
			room: 'baz',
		}
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const section = await prisma.section.findFirstOrThrow();

	t.is(section.buildingName, 'Broomball Courts');
	t.is(section.room, 'baz');
});
