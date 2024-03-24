import {ESemester} from '@mtucourses/scraper';
import {LocationType, Semester} from '@prisma/client';
import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {getFirstTermFromFake} from '../fixtures/utils';
import {ScrapeSectionDetailsTask} from '~/tasks/scrape-section-details';

test.serial('scrapes successfully', async t => {
	const {service} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	t.pass();
});

test.serial('works with 2 sections on course', async t => {
	const {service, fetcherFake, prisma} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	fetcherFake.courses[0].extSections.push({
		...fetcherFake.courses[0].extSections[0],
		section: '02',
	});

	fetcherFake.courses[0].sectionDetails.push({
		crn: '54321',
		extSectionDetails: {
			...fetcherFake.courses[0].sectionDetails[0].extSectionDetails,
		}
	});

	const course = await prisma.course.findFirstOrThrow();

	await prisma.section.create({
		data: {
			courseId: course.id,
			crn: '54321',
			section: '02',
			totalSeats: 0,
			availableSeats: 0,
			takenSeats: 0,
			cmp: '0',
			minCredits: 0,
			maxCredits: 0,
			time: {},
			fee: 0
		}
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	t.pass();
});

test.serial('updates location to online', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	fetcherFake.putFirstSectionDetails({
		location: 'Online Instruction'
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const section = await prisma.section.findFirstOrThrow();

	t.like(section, {
		locationType: LocationType.ONLINE,
		buildingName: null,
		room: null,
	});
});

test.serial('updates room', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	const [course] = fetcherFake.courses;

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const section = await prisma.section.findFirstOrThrow();
	t.is(section.buildingName, 'Fisher Hall');
	t.is(section.room, course.extSections[0].location?.split('Fisher Hall ')[1] ?? '');

	// Update room
	fetcherFake.putFirstSectionDetails({
		location: 'Fisher Hall 123'
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow();
	t.is(updatedSection.buildingName, 'Fisher Hall');
	t.is(updatedSection.room, '123');
});

test.serial('updates instructor', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	const [course] = fetcherFake.courses;

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const section = await prisma.section.findFirstOrThrow({
		include: {
			instructors: true
		}
	});
	t.is(section.instructors.length, course.sectionDetails[0].extSectionDetails.instructors.length);
	t.like(section.instructors[0], {
		fullName: fetcherFake.instructors[0].name,
	});

	// Update instructor
	fetcherFake.putFirstSectionDetails({
		instructors: ['Leo Ureel', 'Max Isom']
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow({
		include: {
			instructors: true
		}
	});
	t.is(updatedSection.instructors.length, 2);
	t.deepEqual(updatedSection.instructors.map(i => i.fullName), ['Leo Ureel', 'Max Isom']);

	// Created new instructors
	const instructor1 = await prisma.instructor.findFirst({
		where: {
			fullName: 'Leo Ureel'
		}
	});
	t.truthy(instructor1);
	const instructor2 = await prisma.instructor.findFirst({
		where: {
			fullName: 'Max Isom'
		}
	});
	t.truthy(instructor2);
});

test.serial('disconnects removed instructor', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	// Remove instructor
	fetcherFake.putFirstSectionDetails({
		instructors: []
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow({
		include: {
			instructors: true
		}
	});
	t.is(updatedSection.instructors.length, 0);
});

test.serial('updates course description', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	const [extensionCourse] = fetcherFake.courses;

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const course = await prisma.course.findFirstOrThrow();
	t.is(course.description, extensionCourse.sectionDetails[0].extSectionDetails.description);

	// Update description
	fetcherFake.putFirstSectionDetails({
		description: 'Updated description'
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedCourse = await prisma.course.findFirstOrThrow();
	t.is(updatedCourse.description, 'Updated description');
});

test.serial('updates course offered semesters', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	// Update offered semesters
	fetcherFake.putFirstSectionDetails({
		semestersOffered: [ESemester.fall, ESemester.spring, ESemester.summer]
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedCourse = await prisma.course.findFirstOrThrow();
	t.deepEqual(updatedCourse.offered, [
		Semester.FALL,
		Semester.SPRING,
		Semester.SUMMER,
	]);
});

test.serial('updates course prereqs', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
		seedCourses: true,
		seedSections: true,
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const course = await prisma.course.findFirstOrThrow();
	t.is(course.prereqs, null);

	// Update prereqs
	fetcherFake.putFirstSectionDetails({
		prereqs: 'Updated prereqs'
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedCourse = await prisma.course.findFirstOrThrow();
	t.is(updatedCourse.prereqs, 'Updated prereqs');
});

test.serial('doesn\'t update if unchanged', async t => {
	const {prisma, service} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedInstructors: true,
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

test.serial('works with multiple sections taught by the same instructor', async t => {
	const {prisma, service, fetcherFake} = await getTestService(ScrapeSectionDetailsTask, {
		seedBuildings: true,
		seedCourses: true,
		seedSections: true,
	});

	const [firstExtensionCourse] = fetcherFake.courses;

	const createdCourse = await prisma.course.create({
		data: {
			subject: 'MA',
			crse: '1101',
			year: firstExtensionCourse.year,
			semester: firstExtensionCourse.semester,
			title: 'Calculus I',
		}
	});

	const createdSection = await prisma.section.create({
		data: {
			courseId: createdCourse.id,
			crn: '12345',
			section: '001',
			totalSeats: 0,
			availableSeats: 0,
			takenSeats: 0,
			cmp: '0',
			minCredits: 0,
			maxCredits: 0,
			time: {},
			fee: 0
		}
	});

	fetcherFake.courses = [
		...fetcherFake.courses,
		{
			extCourse: {
				subject: createdCourse.subject,
				crse: createdCourse.crse,
				title: createdCourse.title,
			},
			extSections: [{
				crn: createdSection.crn,
				section: createdSection.section,
				cmp: createdSection.cmp,
				creditRange: [createdSection.minCredits, createdSection.maxCredits],
				seats: createdSection.totalSeats,
				seatsAvailable: createdSection.availableSeats,
				seatsTaken: createdSection.takenSeats,
				location: null,
				fee: createdSection.fee,
				schedules: [],
				instructors: [
					firstExtensionCourse.extSections[0].instructors[0],
				]
			}],
			sectionDetails: firstExtensionCourse.sectionDetails,
			year: createdCourse.year,
			semester: createdCourse.semester,
		}
	];

	await t.notThrowsAsync(async () => {
		await service.handler({
			terms: [getFirstTermFromFake()],
		});
	});
});
