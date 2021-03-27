import {mocked} from 'ts-jest/utils';
import {getAllSections, ICourseOverview, ISection} from '@mtucourses/scraper';

jest.mock('@mtucourses/scraper');
const mockedSectionsScraper = mocked(getAllSections, true);

const mockCourseUpsert = jest.fn();
const mockCourseFindMany = jest.fn();
const mockCourseFindFirst = jest.fn();
const mockCourseUpdateMany = jest.fn();
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
		findFirst: mockCourseFindFirst,
		updateMany: mockCourseUpdateMany
	},
	section: {
		findMany: mockSectionFindMany,
		findFirst: mockSectionFindFirst,
		create: mockSectionCreate,
		updateMany: mockSectionUpdateMany
	}
}));

jest.mock('@prisma/client', () => ({
	/* eslint-disable-next-line */
	...(jest.requireActual('@prisma/client') as object),
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
		mockedSectionsScraper.mockResolvedValue([]);
		mockCourseFindMany.mockResolvedValue([]);
		mockSectionFindMany.mockResolvedValue([]);

		await processJob(null as any);
	});

	describe('Courses', () => {
		it('inserts a new course', async () => {
			const course: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			mockedSectionsScraper.mockResolvedValue([course]);
			mockCourseFindMany.mockResolvedValue([]);
			mockSectionFindMany.mockResolvedValue([]);

			await processJob(null as any);

			expect(mockCourseUpsert).toHaveBeenCalledTimes(1);

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
			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				sections: []
			};

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);

			await processJob(null as any);

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: {
					year: expect.any(Number),
					semester: expect.any(String),
					subject: 'CS',
					crse: '1000',
					title: 'Intro to Programming (new title)',
					updatedAt: expect.any(Date),
					deletedAt: null
				},
				update: {
					year: expect.any(Number),
					semester: expect.any(String),
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
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: now,
				offered: []
			};

			mockedSectionsScraper.mockResolvedValue([]);
			mockCourseFindMany.mockResolvedValue([storedCourse]);

			await processJob(null as any);

			expect(mockCourseUpdateMany.mock.calls[0][0]).toEqual({
				data: {
					deletedAt: expect.any(Date)
				},
				where: {
					id: {
						in: ['test-id']
					}
				}
			});
		});

		it('adds back a course that was previously deleted', async () => {
			const now = new Date();

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: now,
				updatedAt: now,
				offered: []
			};

			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);
			mockCourseFindMany.mockResolvedValue([storedCourse]);

			await processJob(null as any);

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: {
					year: expect.any(Number),
					semester: expect.any(String),
					subject: 'CS',
					crse: '1000',
					title: 'Intro to Programming',
					updatedAt: expect.any(Date),
					deletedAt: null
				},
				update: {
					year: expect.any(Number),
					semester: expect.any(String),
					subject: 'CS',
					crse: '1000',
					title: 'Intro to Programming',
					updatedAt: expect.any(Date),
					deletedAt: null
				}
			});
		});

		it('doesn\'t modify a section if nothing\'s changed', async () => {
			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);
			mockCourseFindFirst.mockResolvedValue(storedCourse);

			await processJob(null as any);

			expect(mockCourseUpsert).toBeCalledTimes(0);
		});

		it('doesn\'t modify a deleted course if nothing\'s changed', async () => {
			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: new Date(),
				updatedAt: new Date(),
				offered: []
			};

			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);
			mockCourseFindFirst.mockResolvedValue(storedCourse);

			await processJob(null as any);

			expect(mockCourseUpdateMany).toBeCalledTimes(0);
		});
	});

	describe('Sections', () => {
		it('inserts a new section', async () => {
			mockedSectionsScraper.mockResolvedValueOnce([SCRAPED_COURSE_WITH_SECTION]);
			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([]);
			mockSectionFindMany.mockResolvedValue([]);
			mockCourseUpsert.mockImplementation(async ({create}: {create: Course}) => Promise.resolve(create));
			mockSectionCreate.mockResolvedValue({id: 'test-section-id'});
			mockCourseUpsert.mockResolvedValue({id: 'test-course-id'});

			await processJob(null as any);

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
					courseId: 'test-course-id'
				}
			});
		});

		it('updates an existing section', async () => {
			mockedSectionsScraper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [
					{
						...SCRAPED_SECTION,
						crn: 'new-crn'
					}
				]
			}]);

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseId: 'test-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4500000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: 2020, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: 2020, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null}
			};

			mockCourseFindMany.mockResolvedValue([storedCourse]);

			mockCourseFindFirst.mockResolvedValue(storedCourse);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await processJob(null as any);

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
					courseId: 'test-id',
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('deletes a section if it\'s missing in scraped data', async () => {
			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};

			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);

			mockSectionFindMany.mockResolvedValue([{id: 'test-section-id'}]);

			await processJob(null as any);

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
			mockedSectionsScraper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: new Date(),
				courseId: 'test-id',
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

			mockCourseFindMany.mockResolvedValue([storedCourse]);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await processJob(null as any);

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
					courseId: 'test-id',
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('doesn\'t modify a section if nothing\'s changed', async () => {
			mockedSectionsScraper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);

			const storedCourse: Course = {
				id: 'test-id',
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				year: 2020,
				semester: Semester.FALL,
				description: '',
				prereqs: null,
				deletedAt: null,
				updatedAt: new Date(),
				offered: []
			};
			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseId: 'test-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4500000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: 2020, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: 2020, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null}
			};

			mockCourseFindMany.mockResolvedValue([storedCourse]);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await processJob(null as any);

			expect(mockSectionUpdateMany).toBeCalledTimes(0);
		});
	});

	afterEach(() => {
		mockCourseUpsert.mockClear();
		mockCourseFindMany.mockClear();
		mockCourseFindFirst.mockClear();
		mockCourseUpdateMany.mockClear();
		mockSectionFindMany.mockClear();
		mockSectionCreate.mockClear();
		mockSectionFindFirst.mockClear();
		mockSectionUpdateMany.mockClear();

		mockedSectionsScraper.mockClear();
	});
});
