import type {ISchoolFromSearch, ITeacherPage} from '@mtucourses/rate-my-professors';
import type {ICourseOverview, IFaculty, ISection, ISectionDetails} from '@mtucourses/scraper';
import {ESemester} from '@mtucourses/scraper';
import type scraper from '@mtucourses/scraper';
import {Semester} from '@prisma/client';
import type {Except} from 'type-fest';
import type {AbstractFetcherService, RateMyProfessorsFetcher} from '~/fetcher/fetcher.service';
import {dateToTerm} from '~/lib/dates';

const getInstructor = (): IFaculty => ({
	name: 'Gorkem Asilioglu',
	departments: ['Computer Science'],
	email: 'galolu@mtu.edu',
	phone: '906-487-1643',
	office: 'Rekhi Hall 308',
	websiteURL: 'http://pages.mtu.edu/~galolu',
	interests: [],
	occupations: [],
	photoURL: null
});

const getSchool = (): ISchoolFromSearch => ({
	id: 'mtu',
	name: 'Michigan Technological University',
	city: 'Houghton',
	state: 'MI',
});

const getTeacherPage = (): ITeacherPage => ({
	id: 'gorkem-asilioglu',
	firstName: 'Gorkem',
	lastName: 'Asilioglu',
	avgDifficulty: 5,
	avgRating: 3,
	numRatings: 10,
	department: 'CS',
	school: {
		id: getSchool().id,
		name: getSchool().name,
		city: getSchool().city,
		state: getSchool().state
	}
});

const getSection = (): ISection => ({
	crn: '12345',
	section: '0A',
	cmp: '1',
	creditRange: [3, 3],
	seats: 100,
	seatsTaken: 30,
	seatsAvailable: 70,
	instructors: [getInstructor.name],
	location: 'Fisher Hall 121',
	fee: 10_000,
	schedules: [
		{
			dateRange: [
				'08/27',
				'12/11'
			],
			days: 'MW',
			timeRange: [
				'02:00 pm',
				'03:15 pm'
			]
		}
	]
});

type CourseWithSectionDetailsAndTerm = {
	extCourse: Except<ICourseOverview, 'sections'>;
	extSections: ISection[];
	sectionDetails: Array<{crn: string; extSectionDetails: ISectionDetails}>;
	year: number;
	semester: Semester;
};

const getCourseWithSectionDetailsAndTerm =(): CourseWithSectionDetailsAndTerm =>  ({
	year: 2000,
	semester: Semester.FALL,
	extCourse: {
		subject: 'CS',
		crse: '1110',
		title: 'Intro to Programming',
	},
	extSections: [getSection()],
	sectionDetails: [{
		crn: getSection().crn,
		extSectionDetails: {
			title: 'Intro to Programming',
			description: 'An introduction to programming',
			prereqs: null,
			semestersOffered: [ESemester.fall],
			instructors: getSection().instructors,
			location: getSection().location ?? '',
			credits: getSection().creditRange[0]
		}
	}]
});

export class RateMyProfessorsFake implements RateMyProfessorsFetcher {
	schools = [getSchool()];
	teachers = [getTeacherPage()];

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

	instructors = [getInstructor()];
	courses = [getCourseWithSectionDetailsAndTerm()];

	async getAllFaculty() {
		return this.instructors;
	}

	async getAllSections(term: Date){
		const {year, semester} = dateToTerm(term);

		const courses = this.courses.filter(course => course.year === year && course.semester === semester);

		return courses.map(course => ({
			...course.extCourse,
			sections: course.extSections
		}))
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

	putFirstCourse(updatedCourse: Partial<ICourseOverview>) {
		this.courses[0].extCourse = {
			...this.courses[0].extCourse,
			...updatedCourse
		};
	}

	putFirstSection(updatedSection: Partial<ISection>) {
		this.courses[0].extSections[0] = {
			...this.courses[0].extSections[0],
			...updatedSection
		};
	}

	putFirstSectionDetails(updatedSectionDetails: Partial<ISectionDetails>) {
		const course = this.courses[0];

		if (!course) {
			throw new Error('Course not found.');
		}

		this.courses = this.courses.map(c => {
			if (c === course) {
				return {
					...c,
					sectionDetails: [{
						...c.sectionDetails[0],
						extSectionDetails: {
							...c.sectionDetails[0].extSectionDetails,
							...updatedSectionDetails
						}
					}]
				};
			}

			return c;
		});
	}
}
