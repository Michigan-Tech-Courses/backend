import {ESemester} from '@mtucourses/scraper';
import type {Semester} from 'zapatos/schema';

export const fetcherSemesterToDatabaseSemester = (semester: ESemester): Semester => {
	switch (semester) {
		case ESemester.fall:
			return 'FALL';
		case ESemester.spring:
			return 'SPRING';
		case ESemester.summer:
			return 'SUMMER';
		default:
			throw new Error('Invalid semester');
	}
};
