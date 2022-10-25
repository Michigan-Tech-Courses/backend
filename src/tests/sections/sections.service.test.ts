import test from 'ava';
import {Semester} from '@prisma/client';
import {getTestService} from '../fixtures/get-test-service';
import {getFirstTermFromFake} from '../fixtures/utils';
import {dateToTerm} from '~/lib/dates';
import {SectionsService} from '~/sections/sections.service';

test.serial('returns all sections', async t => {
	const {service, pool} = await getTestService(SectionsService, {
		seedCourses: true,
		seedSections: true
	});

	const result = await pool.query(service.getSectionsQuery());
	t.is(result.rowCount, 1);
});

test.serial('returns only updated sections', async t => {
	const {service, prisma, pool} = await getTestService(SectionsService, {
		seedCourses: true,
		seedSections: true
	});

	const now = new Date();

	t.is((await pool.query(service.getSectionsQuery({updatedSince: now} as any))).rowCount, 0);

	await prisma.section.updateMany({
		data: {
			updatedAt: new Date()
		}
	});

	t.is((await pool.query(service.getSectionsQuery({updatedSince: now} as any))).rowCount, 1);
});

test.serial('returns only updated sections (deletedAt)', async t => {
	const {service, prisma, pool} = await getTestService(SectionsService, {
		seedCourses: true,
		seedSections: true
	});

	const now = new Date();

	t.is((await pool.query(service.getSectionsQuery({updatedSince: now} as any))).rowCount, 0);

	await prisma.section.updateMany({
		data: {
			deletedAt: new Date()
		}
	});

	t.is((await pool.query(service.getSectionsQuery({updatedSince: now} as any))).rowCount, 1);
});

test.serial('filter by semester & year', async t => {
	const {service, prisma, pool} = await getTestService(SectionsService, {
		seedCourses: true,
		seedSections: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	// Confirm test data
	t.is(year, 2000);
	t.is(semester, Semester.FALL);

	await prisma.course.create({
		data:
			{
				year: 2001,
				semester: Semester.FALL,
				subject: 'TEST',
				crse: '100',
				title: 'Test Course 1',
				sections: {
					create: {
						crn: '10001',
						section: 'A',
						cmp: '1',
						minCredits: 0,
						maxCredits: 3,
						time: {},
						totalSeats: 10,
						takenSeats: 5,
						availableSeats: 5,
						fee: 0,
					}
				}
			}
	});

	await prisma.course.create({
		data:
			{
				year: 2000,
				semester: Semester.SUMMER,
				subject: 'TEST',
				crse: '100',
				title: 'Test Course 1',
				sections: {
					create: {
						crn: '10001',
						section: 'A',
						cmp: '1',
						minCredits: 0,
						maxCredits: 3,
						time: {},
						totalSeats: 10,
						takenSeats: 5,
						availableSeats: 5,
						fee: 0,
					}
				}
			}
	});

	t.is((await pool.query(service.getSectionsQuery({year, semester} as any))).rowCount, 1);
});

test.serial('filter by semester & year (getFirstSection)', async t => {
	const {service, prisma, pool} = await getTestService(SectionsService, {
		seedCourses: true,
		seedSections: true
	});

	const {year, semester} = dateToTerm(new Date(getFirstTermFromFake()));
	// Confirm test data
	t.is(year, 2000);
	t.is(semester, Semester.FALL);

	await prisma.course.create({
		data:
			{
				year: 2001,
				semester: Semester.FALL,
				subject: 'TEST',
				crse: '100',
				title: 'Test Course 1',
				sections: {
					create: {
						crn: '10001',
						section: 'A',
						cmp: '1',
						minCredits: 0,
						maxCredits: 3,
						time: {},
						totalSeats: 10,
						takenSeats: 5,
						availableSeats: 5,
						fee: 0,
					}
				}
			}
	});

	await prisma.course.create({
		data:
			{
				year: 2000,
				semester: Semester.SUMMER,
				subject: 'TEST',
				crse: '100',
				title: 'Test Course 1',
				sections: {
					create: {
						crn: '10001',
						section: 'A',
						cmp: '1',
						minCredits: 0,
						maxCredits: 3,
						time: {},
						totalSeats: 10,
						takenSeats: 5,
						availableSeats: 5,
						fee: 0,
					}
				}
			}
	});

	t.truthy(await service.getFirstSectionZapatosQuery({year, semester} as any).run(pool));
});

test.serial('getFirstSection by CRN', async t => {
	const {service, prisma, pool} = await getTestService(SectionsService, {
		seedInstructors: true,
		seedCourses: true,
		seedSections: true
	});

	// Connect instructor to section
	const section = await prisma.section.findFirst();

	await prisma.section.update({
		where: {
			id: section?.id
		},
		data: {
			instructors: {
				connect: {
					id: 1
				}
			}
		}
	});

	const result = await service.getFirstSectionZapatosQuery({crn: section?.crn} as any).run(pool);

	t.truthy(result);
	t.truthy(result?.course);
	t.true((result?.instructors.length ?? 0) > 0);
});
