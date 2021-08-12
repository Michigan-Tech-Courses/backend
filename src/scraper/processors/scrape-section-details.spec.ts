import {mocked} from 'ts-jest/utils';
import {ESemester, getSectionDetails, ISectionDetails} from '@mtucourses/scraper';

// Scraper mock
jest.mock('@mtucourses/scraper');
const mockedSectionDetailScraper = mocked(getSectionDetails, true);

// Prisma mocks
const mockCourseUpdate = jest.fn();
const mockSectionFindMany = jest.fn();
const mockSectionUpdate = jest.fn();
const mockQueryRaw = jest.fn();
const mockInstructorCreate = jest.fn();
const mockBuildingFindMany = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	$queryRaw: mockQueryRaw,
	course: {
		update: mockCourseUpdate
	},
	section: {
		findMany: mockSectionFindMany,
		update: mockSectionUpdate
	},
	instructor: {
		create: mockInstructorCreate
	},
	building: {
		findMany: mockBuildingFindMany
	}
}));

jest.mock('@prisma/client', () => ({
	/* eslint-disable-next-line */
	...(jest.requireActual('@prisma/client') as object),
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-section-details';
import {Building, Course, Section, Semester} from '@prisma/client';

const SAMPLE_COURSE: Course = {
	id: 'test-id',
	subject: 'CS',
	crse: '1000',
	title: 'Intro to Programming',
	year: 2020,
	semester: Semester.FALL,
	description: '',
	prereqs: 'High School',
	deletedAt: null,
	updatedAt: new Date(),
	offered: []
};

const SAMPLE_SECTION: Section & {course: Course; instructors: Array<{id: number}>} = {
	id: 'test-section-id',
	updatedAt: new Date(),
	deletedAt: new Date(),
	availableSeats: 10,
	takenSeats: 5,
	totalSeats: 15,
	section: '0A',
	cmp: '1',
	crn: 'test-crn',
	fee: 0,
	minCredits: 3,
	maxCredits: 3,
	time: {},
	courseId: SAMPLE_COURSE.id,
	course: SAMPLE_COURSE,
	instructors: [],
	buildingName: 'Fisher Hall',
	isOnline: false,
	isRemote: false,
	room: '121'
};

const SAMPLE_SCRAPED_SECTION: ISectionDetails = {
	title: 'Intro to Programming',
	description: 'An introduction to programming',
	prereqs: null,
	semestersOffered: [],
	instructors: [],
	location: 'Fisher Hall 121'
};

const SAMPLE_BUILDING: Building = {
	name: 'Fisher Hall',
	shortName: 'Fisher',
	lat: 0,
	lon: 0
};

describe('Section details scrape processor', () => {
	beforeEach(() => {
		mockBuildingFindMany.mockResolvedValueOnce([SAMPLE_BUILDING]);
	});

	it('runs without errors', async () => {
		mockSectionFindMany.mockResolvedValue([]);

		await processJob(null as any);
	});

	it('updates location', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			location: 'Online Instruction'
		});

		mockQueryRaw.mockResolvedValue([{id: 1}]);

		await processJob(null as any);

		expect(mockSectionUpdate.mock.calls[0][0]).toEqual({
			where: {
				id: SAMPLE_SECTION.id
			},
			data: {
				isOnline: true,
				isRemote: false,
				buildingName: null,
				room: null
			}
		});
	});

	it('updates instructors', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			instructors: ['Leo Ureel']
		});

		mockQueryRaw.mockResolvedValue([{id: 1}]);

		await processJob(null as any);

		expect(mockSectionUpdate.mock.calls[0][0]).toEqual({
			where: {
				id: SAMPLE_SECTION.id
			},
			data: {
				instructors: {
					connect: [
						{
							id: 1
						}
					],
					disconnect: []
				}
			}
		});
	});

	it('doesn\'t update instructors if unchanged', async () => {
		mockSectionFindMany.mockResolvedValueOnce([
			{
				...SAMPLE_SECTION,
				instructors: [{
					id: 1
				}]
			}
		]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			instructors: ['Leo Ureel']
		});

		mockQueryRaw.mockResolvedValue([{id: 1}]);

		await processJob(null as any);

		expect(mockSectionUpdate).toBeCalledTimes(0);
	});

	it('disconnects removed instructor', async () => {
		mockSectionFindMany.mockResolvedValueOnce([
			{
				...SAMPLE_SECTION,
				instructors: [{
					id: 1
				}]
			}
		]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue(SAMPLE_SCRAPED_SECTION);

		mockQueryRaw.mockResolvedValue([]);

		await processJob(null as any);

		expect(mockSectionUpdate.mock.calls[0][0]).toEqual({
			where: {
				id: SAMPLE_SECTION.id
			},
			data: {
				instructors: {
					connect: [],
					disconnect: [
						{
							id: 1
						}
					]
				}
			}
		});
	});

	it('updates course description', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue(SAMPLE_SCRAPED_SECTION);

		await processJob(null as any);

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				description: SAMPLE_SCRAPED_SECTION.description,
				offered: [],
				prereqs: null
			}
		});
	});

	it('doesn\'t update course description if unchanged', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			description: '',
			prereqs: SAMPLE_COURSE.prereqs
		});

		await processJob(null as any);

		expect(mockCourseUpdate).toHaveBeenCalledTimes(0);
	});

	it('updates course prereqs', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			description: ''
		});

		await processJob(null as any);

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				prereqs: SAMPLE_SCRAPED_SECTION.prereqs,
				offered: [],
				description: ''
			}
		});
	});

	it('updates course offered semesters', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			semestersOffered: [ESemester.fall]
		});

		await processJob(null as any);

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				prereqs: SAMPLE_SCRAPED_SECTION.prereqs,
				offered: [Semester.FALL],
				description: SAMPLE_SCRAPED_SECTION.description
			}
		});
	});

	afterEach(() => {
		mockCourseUpdate.mockClear();
		mockSectionFindMany.mockClear();
		mockSectionUpdate.mockClear();
		mockQueryRaw.mockClear();
		mockInstructorCreate.mockClear();
		mockedSectionDetailScraper.mockClear();
	});
});
