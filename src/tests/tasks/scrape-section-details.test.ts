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

	t.is(section.locationType, LocationType.ONLINE);
	t.is(section.buildingName, null),
	t.is(section.room, null);
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
		instructors: ['Leo Ureel']
	});

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const updatedSection = await prisma.section.findFirstOrThrow({
		include: {
			instructors: true
		}
	});
	t.is(updatedSection.instructors.length, course.sectionDetails[0].extSectionDetails.instructors.length);
	t.like(updatedSection.instructors[0], {
		fullName: 'Leo Ureel',
	});

	// Created a new instructor
	const instructor = await prisma.instructor.findFirst({
		where: {
			fullName: 'Leo Ureel'
		}
	});
	t.truthy(instructor);
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

	const [extCourse] = fetcherFake.courses;

	await service.handler({
		terms: [getFirstTermFromFake()],
	});

	const course = await prisma.course.findFirstOrThrow();
	t.is(course.description, extCourse.sectionDetails[0].extSectionDetails.description);

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
