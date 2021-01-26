import {mocked} from 'ts-jest/utils';
import {getAllSections, ICourseOverview} from '@mtucourses/scrapper';

jest.mock('@mtucourses/scrapper');
const mockedSectionsScrapper = mocked(getAllSections, true);

const mockCourseUpsert = jest.fn();
const mockCourseFindMany = jest.fn();
const mockCourseUpdate = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	course: {
		upsert: mockCourseUpsert,
		findMany: mockCourseFindMany,
		update: mockCourseUpdate
	}
}));

jest.mock('@prisma/client', () => ({
	...(jest.requireActual('@prisma/client')!),
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-sections';
import {Course, Semester} from '@prisma/client';

describe('Instructor scrape processor', () => {
	it('runs without errors', async () => {
		mockedSectionsScrapper.mockResolvedValue([]);
		mockCourseFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });
	});

	it('inserts a new course', async () => {
		const course: ICourseOverview = {
			subject: 'CS',
			crse: '1000',
			title: 'Intro to Programming',
			sections: []
		};

		mockedSectionsScrapper.mockResolvedValue([course]);
		mockCourseFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpsert).toHaveBeenCalledTimes(3);

		const firstCall = mockCourseUpsert.mock.calls[0][0];

		const {sections, ...courseWithoutSections} = course;

		const expectedModel = {
			...courseWithoutSections,
			year: expect.any(Number),
			semester: expect.any(String),
			updatedAt: expect.any(Date)
		};

		expect(firstCall).toEqual({
			where: {
				year_semester_subject_crse: expect.any(Object)
			},
			create: expectedModel,
			update: expectedModel
		});
	});

	it('updates the title of an existing course', async () => {
		const scrappedCourse: ICourseOverview = {
			subject: 'CS',
			crse: '1000',
			title: 'Intro to Programming (new title)',
			sections: []
		};

		const storedCourse: Course = {
			subject: 'CS',
			crse: '1000',
			title: 'Intro to Programming',
			year: 2020,
			semester: Semester.FALL,
			description: '',
			deletedAt: null,
			updatedAt: new Date()
		};

		mockedSectionsScrapper.mockResolvedValueOnce([scrappedCourse]);
		mockedSectionsScrapper.mockResolvedValue([]);

		mockCourseFindMany.mockResolvedValue([storedCourse]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
			where: {
				year_semester_subject_crse: {year: 2020, semester: 'FALL', subject: 'CS', crse: '1000'}
			},
			create: {
				year: 2020,
				semester: 'FALL',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				updatedAt: expect.any(Date)
			},
			update: {
				year: 2020,
				semester: 'FALL',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				updatedAt: expect.any(Date)
			}
		});
	});

	it('deletes a course if it\'s missing in scrapped data', async () => {
		const now = new Date();

		const storedCourse: Course = {
			subject: 'CS',
			crse: '1000',
			title: 'Intro to Programming',
			year: 2020,
			semester: Semester.FALL,
			description: '',
			deletedAt: null,
			updatedAt: now
		};

		mockedSectionsScrapper.mockResolvedValue([]);
		mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
		mockCourseFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			data: {
				deletedAt: expect.any(Date)
			},
			where: {
				year_semester_subject_crse: {year: 2020, semester: 'FALL', subject: 'CS', crse: '1000'}
			}
		});
	});

	afterEach(() => {
		mockCourseUpsert.mockClear();
		mockCourseFindMany.mockClear();
		mockCourseUpdate.mockClear();
	});
});
