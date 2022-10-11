import type {Course} from '@prisma/client';
import {Semester} from '@prisma/client';

export const COURSE: Course = {
	id: 'test-course-id',
	year: 2020,
	semester: Semester.FALL,
	subject: 'CS',
	crse: '1000',
	title: 'Intro to Programming',
	description: '',
	prereqs: null,
	updatedAt: new Date(),
	deletedAt: null,
	minCredits: 3,
	maxCredits: 3,
	offered: []
};
