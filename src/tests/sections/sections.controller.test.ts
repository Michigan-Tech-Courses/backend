import test from 'ava';
import {Semester} from '@prisma/client';
import {getTestService} from '../fixtures/get-test-service';
import {getFirstTermFromFake} from '../fixtures/utils';
import {SectionsController} from '~/sections/sections.controller';
import {dateToTerm} from '~/lib/dates';

// Test.serial('returns all sections', async t => {
// 	const {service} = await getTestService(SectionsController, {
// 		seedCourses: true,
// 		seedSections: true
// 	});

// 	t.is((await service.getSections()).length, 1);
// });

test.serial('returns only updated sections', async t => {
	const {service, prisma} = await getTestService(SectionsController, {
		seedCourses: true,
		seedSections: true
	});

	const now = new Date();

	t.is((await service.getSections({updatedSince: now} as any)).length, 0);

	await prisma.section.updateMany({
		data: {
			updatedAt: new Date()
		}
	});

	t.is((await service.getSections({updatedSince: now} as any)).length, 1);
});

test.serial('returns only updated sections (deletedAt)', async t => {
	const {service, prisma} = await getTestService(SectionsController, {
		seedCourses: true,
		seedSections: true
	});

	const now = new Date();

	t.is((await service.getSections({updatedSince: now} as any)).length, 0);

	await prisma.section.updateMany({
		data: {
			deletedAt: new Date()
		}
	});

	t.is((await service.getSections({updatedSince: now} as any)).length, 1);
});

test.serial('filter by semester & year', async t => {
	const {service, prisma} = await getTestService(SectionsController, {
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

	t.is((await service.getSections({year, semester} as any)).length, 1);
});
