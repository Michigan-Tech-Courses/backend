import {Semester} from '.prisma/client';
import sortSemesters from './sort-semesters';

describe('sortSemesters', () => {
	it('should sort correctly', () => {
		expect(sortSemesters([
			{year: 2022, semester: Semester.FALL},
			{year: 2021, semester: Semester.FALL},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.SPRING},
			{year: 2020, semester: Semester.FALL}
		])).toEqual([
			{year: 2020, semester: Semester.FALL},
			{year: 2021, semester: Semester.SPRING},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.FALL},
			{year: 2022, semester: Semester.FALL}
		]);
	});
});
