import {Semester} from '@prisma/client';
import test from 'ava';
import sortSemesters from '~/lib/sort-semesters';

test('sorts semesters', t => {
	t.deepEqual(
		sortSemesters([
			{year: 2022, semester: Semester.FALL},
			{year: 2021, semester: Semester.FALL},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.SPRING},
			{year: 2020, semester: Semester.FALL}
		]),
		[
			{year: 2020, semester: Semester.FALL},
			{year: 2021, semester: Semester.SPRING},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.FALL},
			{year: 2022, semester: Semester.FALL}
		]
	);
});
