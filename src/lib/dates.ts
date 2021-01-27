import {Semester} from '@prisma/client';
import {RuleOption} from './rschedule';

export const dateToTerm = (date: Date) => {
	let semester: Semester = Semester.SPRING;

	if (date.getMonth() === 4) {
		semester = Semester.SUMMER;
	} else if (date.getMonth() === 7) {
		semester = Semester.FALL;
	}

	return {semester, year: date.getFullYear()};
};

const DAY_CHAR_MAP: Record<string, RuleOption.ByDayOfWeek> = {
	S: 'SU',
	M: 'MO',
	T: 'TU',
	W: 'WE',
	R: 'TH',
	F: 'FR',
	A: 'SA'
};

export const mapDayCharToRRScheduleString = (day: keyof typeof DAY_CHAR_MAP) => DAY_CHAR_MAP[day];

export const calculateDiffInTime = (time1: string, time2: string): number => {
	const now = new Date();
	const calendarDay = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

	const date1 = new Date(`${calendarDay} ${time1}`);
	const date2 = new Date(`${calendarDay} ${time2}`);

	if (date2 < date1) {
		date2.setDate(date2.getDate() + 1);
	}

	return date2.getTime() - date1.getTime();
};
