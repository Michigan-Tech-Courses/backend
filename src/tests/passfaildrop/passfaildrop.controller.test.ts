import test from 'ava';
import {Semester} from '@prisma/client';
import {getTestService} from '../fixtures/get-test-service';
import {PassFailDropController} from '~/passfaildrop/passfaildrop.controller';

test.serial('returns all records', async t => {
	const {service, prisma} = await getTestService(PassFailDropController, {
		seedCourses: true,
		seedSections: true
	});

	const row = await prisma.passFailDrop.create({
		data: {
			courseSubject: 'CS',
			courseCrse: '1000',
			year: 2020,
			semester: Semester.FALL,
			section: '0A',
			failed: 1,
			dropped: 2,
			total: 10
		}
	});

	const row2 = await prisma.passFailDrop.create({
		data: {
			courseSubject: 'CS',
			courseCrse: '12344',
			year: 2021,
			semester: Semester.FALL,
			section: '0A',
			failed: 3,
			dropped: 8,
			total: 10
		}
	});

	t.deepEqual(await service.getAll(), {
		[`${row.courseSubject}${row.courseCrse}`]: [{
			dropped: row.dropped,
			failed: row.failed,
			total: row.total,
			semester: row.semester,
			year: row.year,
		}],
		[`${row2.courseSubject}${row2.courseCrse}`]: [{
			dropped: row2.dropped,
			failed: row2.failed,
			total: row2.total,
			semester: row2.semester,
			year: row2.year,
		}]
	});
});

test.serial('averages stats', async t => {
	const {service, prisma} = await getTestService(PassFailDropController, {
		seedCourses: true,
		seedSections: true
	});

	const row = await prisma.passFailDrop.create({
		data: {
			courseSubject: 'CS',
			courseCrse: '1000',
			year: 2020,
			semester: Semester.FALL,
			section: '0A',
			failed: 1,
			dropped: 2,
			total: 10
		}
	});

	const row2 = await prisma.passFailDrop.create({
		data: {
			courseSubject: 'CS',
			courseCrse: '1000',
			year: 2020,
			semester: Semester.FALL,
			section: '0B',
			failed: 2,
			dropped: 3,
			total: 10
		}
	});

	t.deepEqual(await service.getAll(), {
		[`${row.courseSubject}${row.courseCrse}`]: [{
			dropped: (row.dropped + row2.dropped) / 2,
			failed: (row.failed + row2.failed) / 2,
			total: (row.total + row2.total) / 2,
			semester: row.semester,
			year: row.year,
		}]
	});
});
