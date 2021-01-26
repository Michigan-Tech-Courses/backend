import {Course, Semester} from '@prisma/client';

interface IUniqueSelector {
	year: number;
	semester: Semester;
	subject: string;
	crse: string;
}

export class CourseMap {
	private readonly map = new Map<string, {saw: boolean; course: Course}>();

	put({course, saw}: {course: Course; saw: boolean}) {
		this.map.set(this.generateNaiveCourseId(course), {saw, course});
	}

	get(selector: IUniqueSelector): Course | null {
		const value = this.map.get(this.generateNaiveCourseId(selector));

		if (value) {
			return value.course;
		}

		return null;
	}

	markAsSeen(selector: IUniqueSelector) {
		const value = this.map.get(this.generateNaiveCourseId(selector));

		if (!value) {
			return;
		}

		this.map.set(this.generateNaiveCourseId(selector), {course: value.course, saw: true});
	}

	getUnseen() {
		const unseen = [];

		for (const [, {saw, course}] of this.map) {
			if (!saw) {
				unseen.push(course);
			}
		}

		return unseen;
	}

	private generateNaiveCourseId(course: IUniqueSelector) {
		return `${course.year}-${course.semester}-${course.subject}-${course.crse}`;
	}
}
