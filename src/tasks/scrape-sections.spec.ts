import {mocked} from 'ts-jest/utils';
import type {ICourseOverview, ISection} from '@mtucourses/scraper';
import {getAllSections} from '@mtucourses/scraper';

import type {Course, Section} from '@prisma/client';
import {LocationType} from '@prisma/client';
import {COURSE} from 'test/test-data';
import {Test} from '@nestjs/testing';
import {PrismaModule} from 'src/prisma/prisma.module';
import {PrismaService} from 'src/prisma/prisma.service';
import {ScrapeSectionsTask} from './scrape-sections';

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

const SCRAPED_SECTION: ISection = {
	cmp: '1',
	creditRange: [
		3
	],
	crn: '84887',
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
	],
	fee: 10_000,
	instructors: [
		'Cyr'
	],
	location: '10 0110',
	seats: 15,
	seatsAvailable: 6,
	seatsTaken: 9,
	section: 'R01'
};

const EXPECTED_PARSED_TIME = {
	exdates: {
		dates: [],
		type: 'Dates'
	},
	exrules: [],
	rdates: {
		dates: [],
		type: 'Dates'
	},
	rrules: [
		{
			config: {
				byDayOfWeek: [
					'MO',
					'WE'
				],
				duration: 4_500_000,
				end: {
					day: 11,
					hour: 15,
					millisecond: 0,
					minute: 15,
					month: 12,
					second: 0,
					timezone: null,
					year: new Date().getFullYear() - 1
				},
				frequency: 'WEEKLY',
				start: {
					day: 27,
					hour: 14,
					millisecond: 0,
					minute: 0,
					month: 8,
					second: 0,
					timezone: null,
					year: new Date().getFullYear() - 1
				}
			},
			type: 'Rule'
		}
	],
	timezone: null,
	type: 'Schedule'
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
	let task: ScrapeSectionsTask;

	const mockedPrisma = {
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
	};

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ScrapeSectionsTask]
		})
			.overrideProvider(PrismaService)
			.useValue(mockedPrisma)
			.compile();

		task = module.get(ScrapeSectionsTask);
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

	it('runs without errors', async () => {
		mockedSectionsScraper.mockResolvedValue([]);
		mockCourseFindMany.mockResolvedValue([]);
		mockSectionFindMany.mockResolvedValue([]);

		await task.handler();
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

			await task.handler();

			expect(mockCourseUpsert).toHaveBeenCalledTimes(1);

			const firstCall = mockCourseUpsert.mock.calls[0][0];

			const {sections, ...courseWithoutSections} = course;

			const expectedModel = {
				...courseWithoutSections,
				minCredits: 0,
				maxCredits: 0,
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

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);

			mockCourseFindMany.mockResolvedValue([COURSE]);

			await task.handler();

			const expectedModel = {
				year: expect.any(Number),
				semester: expect.any(String),
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				updatedAt: expect.any(Date),
				deletedAt: null,
				minCredits: 0,
				maxCredits: 0
			};

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: expectedModel,
				update: expectedModel
			});
		});

		it('updates credits of an existing course', async () => {
			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				sections: [
					{
						...SCRAPED_SECTION,
						creditRange: [1, 3]
					}
				]
			};

			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseId: 'test-course-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 1,
				maxCredits: 3,
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4_500_000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: new Date().getFullYear() - 1, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: new Date().getFullYear() - 1, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null},
				locationType: LocationType.UNKNOWN,
				buildingName: null,
				room: null
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);
			mockSectionFindFirst.mockResolvedValue(storedSection);

			mockCourseFindMany.mockResolvedValue([COURSE]);
			mockCourseFindFirst.mockResolvedValue(COURSE);
			mockCourseUpsert.mockResolvedValue(COURSE);

			await task.handler();

			const expectedModel = {
				year: expect.any(Number),
				semester: expect.any(String),
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				updatedAt: expect.any(Date),
				deletedAt: null,
				minCredits: 1,
				maxCredits: 3
			};

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: expectedModel,
				update: expectedModel
			});
		});

		it('correctly populates credits of an existing course (all sections have same range)', async () => {
			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				sections: [
					{
						...SCRAPED_SECTION,
						creditRange: [3]
					}
				]
			};

			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseId: 'test-course-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4_500_000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: new Date().getFullYear() - 1, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: new Date().getFullYear() - 1, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null},
				locationType: LocationType.UNKNOWN,
				buildingName: null,
				room: null
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);
			mockSectionFindFirst.mockResolvedValue(storedSection);

			mockCourseFindMany.mockResolvedValue([COURSE]);
			mockCourseFindFirst.mockResolvedValue(COURSE);
			mockCourseUpsert.mockResolvedValue(COURSE);

			await task.handler();

			const expectedModel = {
				year: expect.any(Number),
				semester: expect.any(String),
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming (new title)',
				updatedAt: expect.any(Date),
				deletedAt: null,
				minCredits: 3,
				maxCredits: 3
			};

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: expectedModel,
				update: expectedModel
			});
		});

		it('deletes a course if it\'s missing in scraped data', async () => {
			mockedSectionsScraper.mockResolvedValue([]);
			mockCourseFindMany.mockResolvedValue([COURSE]);

			await task.handler();

			expect(mockCourseUpdateMany.mock.calls[0][0]).toEqual({
				data: {
					deletedAt: expect.any(Date)
				},
				where: {
					id: {
						in: ['test-course-id']
					}
				}
			});
		});

		it('adds back a course that was previously deleted', async () => {
			const now = new Date();

			const storedCourse: Course = {
				...COURSE,
				deletedAt: now,
				updatedAt: now
			};

			const scrapedCourse: ICourseOverview = {
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				sections: []
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);
			mockCourseFindMany.mockResolvedValue([storedCourse]);

			await task.handler();

			const expectedModel = {
				year: expect.any(Number),
				semester: expect.any(String),
				subject: 'CS',
				crse: '1000',
				title: 'Intro to Programming',
				updatedAt: expect.any(Date),
				deletedAt: null,
				minCredits: 0,
				maxCredits: 0
			};

			expect(mockCourseUpsert.mock.calls[0][0]).toEqual({
				where: {
					year_semester_subject_crse: {
						year: expect.any(Number),
						semester: expect.any(String),
						subject: 'CS', crse: '1000'
					}
				},
				create: expectedModel,
				update: expectedModel
			});
		});

		it('doesn\'t modify a course if nothing\'s changed', async () => {
			const scrapedCourse: ICourseOverview = {
				subject: COURSE.subject,
				crse: COURSE.crse,
				title: COURSE.title,
				sections: []
			};

			const storedCourse: Course = {
				...COURSE,
				minCredits: 0,
				maxCredits: 0
			};

			mockedSectionsScraper.mockResolvedValue([scrapedCourse]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);
			mockCourseFindFirst.mockResolvedValue(storedCourse);

			await task.handler();

			expect(mockCourseUpsert).toBeCalledTimes(0);
		});

		it('doesn\'t modify a deleted course if nothing\'s changed', async () => {
			const now = new Date();
			const storedCourse: Course = {
				...COURSE,
				deletedAt: new Date(),
				updatedAt: new Date()
			};

			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([storedCourse]);
			mockCourseFindFirst.mockResolvedValue(storedCourse);

			await task.handler();

			expect(mockCourseUpdateMany).toBeCalledTimes(0);
		});
	});

	describe('Sections', () => {
		it('inserts a new section', async () => {
			mockedSectionsScraper.mockResolvedValueOnce([SCRAPED_COURSE_WITH_SECTION]);
			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([]);
			mockSectionFindFirst.mockResolvedValue(null);
			mockSectionFindMany.mockResolvedValue([]);
			mockCourseUpsert.mockImplementation(async ({create}: {create: Course}) => create);
			mockSectionCreate.mockResolvedValue({id: 'test-section-id'});
			mockCourseUpsert.mockResolvedValue({id: 'test-course-id'});

			await task.handler();

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
					time: EXPECTED_PARSED_TIME,
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

			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: null,
				courseId: 'test-course-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4_500_000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: new Date().getFullYear() - 1, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: new Date().getFullYear() - 1, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null},
				locationType: LocationType.UNKNOWN,
				buildingName: null,
				room: null
			};

			mockCourseFindMany.mockResolvedValue([COURSE]);

			mockCourseFindFirst.mockResolvedValue(COURSE);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await task.handler();

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
					courseId: 'test-course-id',
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('deletes a section if it\'s missing in scraped data', async () => {
			mockedSectionsScraper.mockResolvedValue([]);

			mockCourseFindMany.mockResolvedValue([COURSE]);

			mockSectionFindMany.mockResolvedValue([{id: 'test-section-id'}]);

			await task.handler();

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

			const storedSection: Section = {
				id: 'test-section-id',
				updatedAt: new Date(),
				deletedAt: new Date(),
				courseId: 'test-course-id',
				availableSeats: SCRAPED_SECTION.seatsAvailable,
				takenSeats: SCRAPED_SECTION.seatsTaken,
				totalSeats: SCRAPED_SECTION.seats,
				section: SCRAPED_SECTION.section,
				cmp: SCRAPED_SECTION.cmp,
				crn: SCRAPED_SECTION.crn,
				fee: SCRAPED_SECTION.fee,
				minCredits: 3,
				maxCredits: 3,
				time: {},
				locationType: LocationType.UNKNOWN,
				buildingName: null,
				room: null
			};

			mockCourseFindMany.mockResolvedValue([COURSE]);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await task.handler();

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
					courseId: 'test-course-id',
					section: SCRAPED_SECTION.section
				}
			});
		});

		it('doesn\'t modify a section if nothing\'s changed', async () => {
			mockedSectionsScraper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);

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
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4_500_000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: new Date().getFullYear() - 1, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: new Date().getFullYear() - 1, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null},
				locationType: LocationType.UNKNOWN,
				buildingName: null,
				room: null
			};

			mockCourseFindMany.mockResolvedValue([COURSE]);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await task.handler();

			expect(mockSectionUpdateMany).toBeCalledTimes(0);
		});

		it('doesn\'t ever modify a section\'s location', async () => {
			mockedSectionsScraper.mockResolvedValue([{
				...SCRAPED_COURSE,
				sections: [SCRAPED_SECTION]
			}]);

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
				time: {type: 'Schedule', rrules: [{type: 'Rule', config: {frequency: 'WEEKLY', duration: 4_500_000, byDayOfWeek: ['MO', 'WE'], start: {timezone: null, year: new Date().getFullYear() - 1, month: 8, day: 27, hour: 14, minute: 0, second: 0, millisecond: 0}, end: {timezone: null, year: new Date().getFullYear() - 1, month: 12, day: 11, hour: 15, minute: 15, second: 0, millisecond: 0}}}], exrules: [], rdates: {type: 'Dates', dates: []}, exdates: {type: 'Dates', dates: []}, timezone: null},
				locationType: LocationType.PHYSICAL,
				buildingName: 'Fisher Hall',
				room: '0100'
			};

			mockCourseFindMany.mockResolvedValue([COURSE]);

			mockSectionFindMany.mockResolvedValue([storedSection]);

			mockSectionFindFirst.mockResolvedValue(storedSection);

			await task.handler();

			expect(mockSectionUpdateMany).toBeCalledTimes(0);
		});
	});
});
