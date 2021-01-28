import {Course} from '@prisma/client';

export const getUniqueCompositeForCourse = (course: Course) => ({
	year: course.year,
	semester: course.semester,
	subject: course.subject,
	crse: course.crse
});
