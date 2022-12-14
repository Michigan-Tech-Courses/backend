import test from 'ava';
import {Semester} from '@prisma/client';
import {getTestService} from '../fixtures/get-test-service';
import {getFirstTermFromFake} from '../fixtures/utils';
import {dateToTerm} from '~/lib/dates';
import {CoursesService} from '~/courses/courses.service';

test.serial('returns all courses', async t => {
	const {service, pool, prisma} = await getTestService(CoursesService, {
		seedCourses: true
	});

	await prisma.course.updateMany({
		data: {
			offered: [Semester.FALL, Semester.SPRING]
		}
	});

	const query = service.getAllCoursesQuery();
	const result = await pool.query(query.text, query.values);

	// Check that offered was cast correctly
	t.is(result.rows[0].offered.length, 2);

	t.is(result.rowCount, 1);
});

test.serial('returns updated courses', async t => {
	const {service, prisma, pool} = await getTestService(CoursesService, {
		seedCourses: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	const now = new Date();

	const query = service.getAllCoursesQuery({updatedSince: now, year, semester});

	t.is((await pool.query(query.text, query.values)).rowCount, 0);

	await prisma.course.updateMany({
		data: {
			updatedAt: new Date()
		}
	});

	t.is((await pool.query(query.text, query.values)).rowCount, 1);
});

test.serial('returns updated (deleted) courses', async t => {
	const {service, prisma, pool} = await getTestService(CoursesService, {
		seedCourses: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	const now = new Date();

	const query = service.getAllCoursesQuery({updatedSince: now, year, semester});

	t.is((await pool.query(query.text, query.values)).rowCount, 0);

	await prisma.course.updateMany({
		data: {
			deletedAt: new Date()
		}
	});

	t.is((await pool.query(query.text, query.values)).rowCount, 1);
});

test.serial('returns unique courses (by CRSE & subject)', async t => {
	const {service, prisma, pool} = await getTestService(CoursesService, {
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

	const allUniqueCoursesQuery = await service.getUniqueCoursesQuery(pool);
	t.is((await pool.query(allUniqueCoursesQuery)).rowCount, 3);

	const fallUniqueCoursesQuery = await service.getUniqueCoursesQuery(pool, {semester: Semester.FALL} as any);
	t.is((await pool.query(fallUniqueCoursesQuery)).rowCount, 2);

	const uniqueCoursesAfter2000Query = await service.getUniqueCoursesQuery(pool, {startYear: 2000} as any);
	t.is((await pool.query(uniqueCoursesAfter2000Query)).rowCount, 2);
});

test.serial('returns unique courses with updatedSince', async t => {
	const {service, prisma, pool} = await getTestService(CoursesService, {
		seedCourses: true
	});

	const now = new Date();

	const query = await service.getUniqueCoursesQuery(pool, {updatedSince: now} as any);

	t.is((await pool.query(query.text, query.values)).rowCount, 0);

	await prisma.course.updateMany({
		data: {
			updatedAt: new Date(Date.now() + 1000)
		}
	});

	t.is((await pool.query(query.text, query.values)).rowCount, 1);
});

test.serial('returns unique courses with updatedSince (deleted)', async t => {
	const {service, prisma, pool} = await getTestService(CoursesService, {
		seedCourses: true
	});

	const now = new Date();

	const query = await service.getUniqueCoursesQuery(pool, {updatedSince: now} as any);

	t.is((await pool.query(query.text, query.values)).rowCount, 0);

	await prisma.course.updateMany({
		data: {
			deletedAt: new Date(Date.now() + 1000)
		}
	});

	t.is((await pool.query(query.text, query.values)).rowCount, 1);
});

test.serial('finds first course', async t => {
	const {service, pool} = await getTestService(CoursesService, {
		seedCourses: true
	});

	t.truthy(await service.getFirstCourseZapatosQuery().run(pool));
});
