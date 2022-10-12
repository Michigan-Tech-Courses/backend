import type {ISchoolFromSearch, ITeacherPage} from '@mtucourses/rate-my-professors';
import type {IFaculty} from '@mtucourses/scraper';
import type {AbstractFetcherService, RateMyProfessorsFetcher} from '~/fetcher/fetcher.service';

const instructor: IFaculty = {
	name: 'Gorkem Asilioglu',
	departments: ['Computer Science'],
	email: 'galolu@mtu.edu',
	phone: '906-487-1643',
	office: 'Rekhi Hall 308',
	websiteURL: 'http://pages.mtu.edu/~galolu',
	interests: [],
	occupations: [],
	photoURL: null
};

const school: ISchoolFromSearch = {
	id: 'mtu',
	name: 'Michigan Technological University',
	city: 'Houghton',
	state: 'MI',
};

const teacherPage: ITeacherPage = {
	id: 'gorkem-asilioglu',
	firstName: 'Gorkem',
	lastName: 'Asilioglu',
	avgDifficulty: 5,
	avgRating: 3,
	numRatings: 10,
	department: 'CS',
	school: {
		id: school.id,
		name: school.name,
		city: school.city,
		state: school.state
	}
};

export class RateMyProfessorsFake implements RateMyProfessorsFetcher {
	schools = [school];
	teachers = [teacherPage];

	async searchSchool(query: string) {
		return this.schools.filter(school => school.name.toLowerCase().includes(query.toLowerCase()));
	}

	async searchTeacher(name: string, schoolId: string) {
		return this.teachers
			.filter(teacher => teacher.school.id === schoolId && name.toLowerCase().includes(`${teacher.firstName.toLowerCase()} ${teacher.lastName.toLowerCase()}`))
			.map(teacher => ({
				id: teacher.id,
				firstName: teacher.firstName,
				lastName: teacher.lastName,
				school: {
					id: teacher.school.id,
					name: teacher.school.name
				}
			}));
	}

	async getTeacher(id: string) {
		const teacher = this.teachers.find(teacher => teacher.id === id);

		if (!teacher) {
			throw new Error('Teacher not found.');
		}

		return teacher;
	}
}

export class FakeFetcherService implements AbstractFetcherService {
	readonly rateMyProfessors = new RateMyProfessorsFake();

	instructors = [instructor];

	async getAllFaculty() {
		return this.instructors;
	}
}
