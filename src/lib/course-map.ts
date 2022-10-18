import type {Course} from '@prisma/client';

export class CourseMap {
	private readonly map = new Map<string, {saw: boolean; course: Course}>();

	put({course, saw}: {course: Course; saw: boolean}) {
		this.map.set(course.id, {saw, course});
	}

	markAsSeen(course: Course) {
		const value = this.map.get(course.id);

		if (!value) {
			return;
		}

		this.map.set(course.id, {course: value.course, saw: true});
	}

	getUnseen() {
		const unseen = [];

		for (const [, {saw, course}] of this.map) {
			if (!saw && !course.deletedAt) {
				unseen.push(course);
			}
		}

		return unseen;
	}
}
