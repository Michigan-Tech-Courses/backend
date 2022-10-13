import type {ISchoolFromSearch, ITeacherPage} from '@mtucourses/rate-my-professors';
import type {ICourseOverview, IFaculty, ISection, ISectionDetails} from '@mtucourses/scraper';
import {ESemester} from '@mtucourses/scraper';
import type scraper from '@mtucourses/scraper';
import {Semester} from '@prisma/client';
import type {Except} from 'type-fest';
import type {AbstractFetcherService, RateMyProfessorsFetcher} from '~/fetcher/fetcher.service';
import {dateToTerm} from '~/lib/dates';

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

const section: ISection = {
	crn: '12345',
	section: '0A',
	cmp: '1',
	creditRange: [3, 3],
	seats: 100,
	seatsTaken: 30,
	seatsAvailable: 70,
	instructors: [instructor.name],
	location: 'Fisher Hall 121',
	fee: 0,
	// Todo: add schedules
	schedules: []
};

type CourseWithSectionDetailsAndTerm = {
	extCourse: Except<ICourseOverview, 'sections'>;
	extSections: ISection[];
	sectionDetails: Array<{crn: string; extSectionDetails: ISectionDetails}>;
	year: number;
	semester: Semester;
};

const courseWithSectionDetailsAndTerm: CourseWithSectionDetailsAndTerm = {
	year: 2000,
	semester: Semester.FALL,
	extCourse: {
		subject: 'CS',
		crse: '1110',
		title: 'Intro to Programming',
	},
	extSections: [section],
	sectionDetails: [{
		crn: section.crn,
		extSectionDetails: {
			title: 'Intro to Programming',
			description: 'An introduction to programming',
			prereqs: null,
			semestersOffered: [ESemester.fall],
			instructors: section.instructors,
			location: section.location ?? '',
			credits: section.creditRange[0]
		}
	}]
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
	courses = [courseWithSectionDetailsAndTerm];

	async getAllFaculty() {
		return this.instructors;
	}

	async getSectionDetails(options: Parameters<typeof scraper.getSectionDetails>[0]): Promise<ISectionDetails> {
		const {year, semester} = dateToTerm(options.term);

		const course = this.courses.find(course => course.year === year && course.semester === semester && course.extCourse.subject === options.subject && course.extCourse.crse === options.crse);

		if (!course) {
			throw new Error('Course not found.');
		}

		const section = course.sectionDetails.find(section => section.crn === options.crn);

		if (!section) {
			throw new Error('Section not found.');
		}

		return section.extSectionDetails;
	}
}
