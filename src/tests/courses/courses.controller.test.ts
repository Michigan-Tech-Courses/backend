import test from 'ava';
import {Semester} from '@prisma/client';
import {getTestService} from '../fixtures/get-test-service';
import {getFirstTermFromFake} from '../fixtures/utils';
import {CoursesController} from '~/courses/courses.controller';
import {dateToTerm} from '~/lib/dates';

test.serial('returns all courses', async t => {
	const {service} = await getTestService(CoursesController, {
		seedCourses: true
	});

	t.is((await service.getAllCourses()).length, 1);
});

test.serial('returns updated courses', async t => {
	const {service, prisma} = await getTestService(CoursesController, {
		seedCourses: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	const now = new Date();

	t.is((await service.getAllCourses({updatedSince: now, year, semester})).length, 0);

	await prisma.course.updateMany({
		data: {
			updatedAt: new Date()
		}
	});

	t.is((await service.getAllCourses({updatedSince: now, year, semester})).length, 1);
});

test.serial('returns updated (deleted) courses', async t => {
	const {service, prisma} = await getTestService(CoursesController, {
		seedCourses: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	const now = new Date();

	t.is((await service.getAllCourses({updatedSince: now, year, semester})).length, 0);

	await prisma.course.updateMany({
		data: {
			deletedAt: new Date()
		}
	});

	t.is((await service.getAllCourses({updatedSince: now, year, semester})).length, 1);
});

test.serial('returns unique courses (by CRSE & subject)', async t => {
	const {service, prisma} = await getTestService(CoursesController, {
		seedCourses: true
	});

	const {id, ...courseWithoutId} = await prisma.course.findFirstOrThrow();
	// Double-checking what our fake course looks like
	t.is(courseWithoutId.semester, Semester.FALL);
	t.is(courseWithoutId.year, 2000);

	await prisma.course.createMany({
		data: [
			// Create same course in different term...
			{
				...courseWithoutId,
				semester: Semester.SUMMER,
				year: 2001
			},
			// ...and a completely different course
			{
				crse: '9876',
				subject: 'TEST',
				semester: Semester.FALL,
				year: 1999,
				title: 'Test Course 2',
			}
		]
	});

	const allUniqueCourses = await service.getUniqueCourses();
	t.is(allUniqueCourses.length, 2);

	const fallUniqueCourses = await service.getUniqueCourses({semester: Semester.FALL} as any);
	t.is(fallUniqueCourses.length, 2);

	const uniqueCoursesAfter2000 = await service.getUniqueCourses({startYear: 2000} as any);
	t.is(uniqueCoursesAfter2000.length, 1);
});

test.serial('returns unique courses with updatedSince', async t => {
	const {service, prisma} = await getTestService(CoursesController, {
		seedCourses: true
	});

	const now = new Date();

	t.is((await service.getUniqueCourses({updatedSince: now} as any)).length, 0);

	await prisma.course.updateMany({
		data: {
			updatedAt: new Date(Date.now() + 1000)
		}
	});

	t.is((await service.getUniqueCourses({updatedSince: now} as any)).length, 1);
});

test.serial('returns unique courses with updatedSince (deleted)', async t => {
	const {service, prisma} = await getTestService(CoursesController, {
		seedCourses: true
	});

	const now = new Date();

	t.is((await service.getUniqueCourses({updatedSince: now} as any)).length, 0);

	await prisma.course.updateMany({
		data: {
			deletedAt: new Date(Date.now() + 1000)
		}
	});

	t.is((await service.getUniqueCourses({updatedSince: now} as any)).length, 1);
});
