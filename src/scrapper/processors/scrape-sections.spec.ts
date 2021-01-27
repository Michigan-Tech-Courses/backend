import {mocked} from 'ts-jest/utils';
import {getAllSections, ICourseOverview, ISection} from '@mtucourses/scrapper';

jest.mock('@mtucourses/scrapper');
const mockedSectionsScrapper = mocked(getAllSections, true);

const mockCourseUpsert = jest.fn();
const mockCourseFindMany = jest.fn();
const mockCourseUpdate = jest.fn();
const mockSectionFindMany = jest.fn();
const mockSectionCreate = jest.fn();
const mockSectionFindFirst = jest.fn();
const mockSectionUpdateMany = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	course: {
		upsert: mockCourseUpsert,
		findMany: mockCourseFindMany,
		update: mockCourseUpdate
	},
	section: {
		findMany: mockSectionFindMany,
		findFirst: mockSectionFindFirst,
		create: mockSectionCreate,
		updateMany: mockSectionUpdateMany
	}
}));

jest.mock('@prisma/client', () => ({
	...(jest.requireActual('@prisma/client')!),
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-sections';
import {Course, Section, Semester} from '@prisma/client';

const SCRAPED_SECTION: ISection = {
	cmp: '1',
	creditRange: [
		3
	],
	crn: '84887',
	dateRange: [
		'08/27',
		'12/11'
	],
	days: 'MW',
	fee: 10000,
	instructors: [
		'Cyr'
	],
	location: '10 0110',
	seats: 15,
	seatsAvailable: 6,
	seatsTaken: 9,
	section: 'R01',
	timeRange: [
		'02:00 pm',
		'03:15 pm'
	]
};

const SCRAPED_COURSE: ICourseOverview = {
	subject: 'CS',
	crse: '1000',
	title: 'Intro to Programming',
	sections: []
};

const SCRAPED_COURSE_WITH_SECTION: ICourseOverview = {
	...SCRAPED_COURSE,
	sections: [SCRAPED_SECTION]
};

describe('Courses and sections scrape processor', () => {
	it('runs without errors', async () => {
		mockedSectionsScrapper.mockResolvedValue([]);
		mockCourseFindMany.mockResolvedValue([]);
		mockSectionFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });
	});

	describe('Courses', () => {
		it('inserts a new course', async () => {
			const course: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			mockedSectionsScrapper.mockResolvedValue([course]);
			mockCourseFindMany.mockResolvedValue([]);
			mockSectionFindMany.mockResolvedValue([]);

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockCourseUpsert).toHaveBeenCalledTimes(3);

			const firstCall = mockCourseUpsert.mock.calls[0][0];

			const {sections, ...courseWithoutSections} = course;

			const expectedModel = {
				...courseWithoutSections,
				year: expect.any(Number),
				semester: expect.any(String),
				updatedAt: expect.any(Date),
				deletedAt: null
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
					updatedAt: expect.any(Date),
					deletedAt: null
				},
				update: {
					year: 2020,
					semester: 'FALL',
					subject: 'CS',
					crse: '1000',
					title: 'Intro to Programming (new title)',
					updatedAt: expect.any(Date),
					deletedAt: null
				}
			});
		});

		it('deletes a course if it\'s missing in scraped data', async () => {
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

		it('adds back a course that was previously deleted', async () => {
			const now = new Date();

			const storedCourse: Course = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				deletedAt: now,
				updatedAt: now
			};

			const scrappedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			mockedSectionsScrapper.mockResolvedValueOnce([scrappedCourse]);
			mockedSectionsScrapper.mockResolvedValue([]);
			mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
			mockCourseFindMany.mockResolvedValue([]);

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
					title: 'Intro to Programming',
					updatedAt: expect.any(Date),
					deletedAt: null
				},
				update: {
					year: 2020,
					semester: 'FALL',
					subject: 'CS',
					crse: '1000',
					title: 'Intro to Programming',
					updatedAt: expect.any(Date),
					deletedAt: null
				}
			});
		});

		it('doesn\'t modify a section if nothing\'s changed', async () => {
			const scrappedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
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

			expect(mockCourseUpsert).toBeCalledTimes(0);
		});
	});

	describe('Sections', () => {
		it('inserts a new section', async () => {
			mockedSectionsScrapper.mockResolvedValueOnce([SCRAPED_COURSE_WITH_SECTION]);
			mockedSectionsScrapper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([]);
			mockSectionFindMany.mockResolvedValue([]);
			mockCourseUpsert.mockImplementation(async ({create}: {create: Course}) => Promise.resolve(create));
			mockSectionCreate.mockImplementation(async () => Promise.resolve({id: 'test-id'}));

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockSectionCreate).toHaveBeenCalledTimes(1);

			expect(mockSectionCreate.mock.calls[0][0]).toEqual({
				data: {
					availableSeats: SCRAPED_SECTION.seatsAvailable,
					takenSeats: SCRAPED_SECTION.seatsTaken,
					totalSeats: SCRAPED_SECTION.seats,
					section: SCRAPED_SECTION.section,
					cmp: SCRAPED_SECTION.cmp,
					crn: SCRAPED_SECTION.crn,
					fee: SCRAPED_SECTION.fee,
					minCredits: expect.any(Number),
					maxCredits: expect.any(Number),
					time: expect.any(Object),
					course: {
						connect: {
							year_semester_subject_crse: {
								crse: SCRAPED_COURSE_WITH_SECTION.crse,
								semester: expect.any(String),
								subject: SCRAPED_COURSE_WITH_SECTION.subject,
								year: expect.any(Number)
							}
						}
					}
				}
			});
		});

		it('updates an existing section', async () => {
			mockedSectionsScrapper.mockResolvedValueOnce([{
				...SCRAPED_COURSE,
				sections: [
					{
						...SCRAPED_SECTION,
						crn: 'new-crn'
					}
				]
			}]);
			mockedSectionsScrapper.mockResolvedValue([]);

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
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseCrse: '1000',
				courseSemester: Semester.FALL,
				courseSubject: 'CS',
				courseYear: 2020,
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {}
			};

			mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
			mockCourseFindMany.mockResolvedValue([]);

			mockSectionFindMany.mockResolvedValueOnce([storedSection]);
			mockSectionFindMany.mockResolvedValue([]);

			mockSectionFindFirst.mockResolvedValueOnce(storedSection);
			mockSectionFindFirst.mockResolvedValue(null);

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockSectionUpdateMany.mock.calls[0][0]).toEqual({
				data: {
					availableSeats: SCRAPED_SECTION.seatsAvailable,
					takenSeats: SCRAPED_SECTION.seatsTaken,
					totalSeats: SCRAPED_SECTION.seats,
					section: SCRAPED_SECTION.section,
					cmp: SCRAPED_SECTION.cmp,
					crn: 'new-crn',
					fee: SCRAPED_SECTION.fee,
					minCredits: expect.any(Number),
					maxCredits: expect.any(Number),
					time: expect.any(Object),
					deletedAt: null
				},
				where: {
					course: {
						crse: SCRAPED_COURSE.crse,
						semester: Semester.FALL,
						subject: SCRAPED_COURSE.subject,
						year: 2020
					},
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('deletes a section if it\'s missing in scraped data', async () => {
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

			mockedSectionsScrapper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
			mockCourseFindMany.mockResolvedValue([]);

			mockSectionFindMany.mockResolvedValueOnce([{id: 'test-section-id'}]);
			mockSectionFindMany.mockResolvedValue([]);

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockSectionUpdateMany.mock.calls[0][0]).toEqual({
				data: {
					deletedAt: expect.any(Date)
				},
				where: {
					id: {
						in: ['test-section-id']
					}
				}
			});
		});

		it('adds back a section that was previously deleted', async () => {
			mockedSectionsScrapper.mockResolvedValueOnce([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);
			mockedSectionsScrapper.mockResolvedValue([]);

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
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: new Date(),
				courseCrse: '1000',
				courseSemester: Semester.FALL,
				courseSubject: 'CS',
				courseYear: 2020,
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {}
			};

			mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
			mockCourseFindMany.mockResolvedValue([]);

			mockSectionFindMany.mockResolvedValueOnce([storedSection]);
			mockSectionFindMany.mockResolvedValue([]);

			mockSectionFindFirst.mockResolvedValueOnce(storedSection);
			mockSectionFindFirst.mockResolvedValue(null);

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockSectionUpdateMany.mock.calls[0][0]).toEqual({
				data: {
					availableSeats: SCRAPED_SECTION.seatsAvailable,
					takenSeats: SCRAPED_SECTION.seatsTaken,
					totalSeats: SCRAPED_SECTION.seats,
					section: SCRAPED_SECTION.section,
					cmp: SCRAPED_SECTION.cmp,
					crn: SCRAPED_SECTION.crn,
					fee: SCRAPED_SECTION.fee,
					minCredits: expect.any(Number),
					maxCredits: expect.any(Number),
					time: expect.any(Object),
					deletedAt: null
				},
				where: {
					course: {
						crse: SCRAPED_COURSE.crse,
						semester: Semester.FALL,
						subject: SCRAPED_COURSE.subject,
						year: 2020
					},
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('doesn\'t modify a section if nothing\'s changed', async () => {
			mockedSectionsScrapper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);

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
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseCrse: '1000',
				courseSemester: Semester.FALL,
				courseSubject: 'CS',
				courseYear: 2020,
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {}
			};

			mockCourseFindMany.mockResolvedValueOnce([storedCourse]);
			mockCourseFindMany.mockResolvedValue([]);

			mockSectionFindMany.mockResolvedValueOnce([storedSection]);
			mockSectionFindMany.mockResolvedValue([]);

			mockSectionFindFirst.mockResolvedValueOnce(storedSection);
			mockSectionFindFirst.mockResolvedValue(null);

			await processJob(null as any, () => { /* empty callback */ });

			expect(mockSectionUpdateMany).toBeCalledTimes(0);
		});
	});

	afterEach(() => {
		mockCourseUpsert.mockClear();
		mockCourseFindMany.mockClear();
		mockCourseUpdate.mockClear();
		mockSectionFindMany.mockClear();
		mockSectionFindFirst.mockClear();
		mockSectionCreate.mockClear();
		mockSectionUpdateMany.mockClear();
	});
});
