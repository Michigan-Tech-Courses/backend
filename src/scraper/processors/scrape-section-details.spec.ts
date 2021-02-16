import {mocked} from 'ts-jest/utils';
import {getSectionDetails, ISectionDetails} from '@mtucourses/scraper';

// Scraper mock
jest.mock('@mtucourses/scraper');
const mockedSectionDetailScraper = mocked(getSectionDetails, true);

// Prisma mocks
const mockCourseUpdate = jest.fn();
const mockSectionFindMany = jest.fn();
const mockSectionUpdate = jest.fn();
const mockInstructorFindMany = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	course: {
		update: mockCourseUpdate
	},
	section: {
		findMany: mockSectionFindMany,
		update: mockSectionUpdate
	},
	instructor: {
		findMany: mockInstructorFindMany
	}
}));

jest.mock('@prisma/client', () => ({
	...(jest.requireActual('@prisma/client')!),
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-section-details';
import {Course, Section, Semester} from '@prisma/client';

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
	updatedAt: new Date()
};

const SAMPLE_SECTION: Section & { course: Course; instructors: Array<{ id: number }> } = {
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
	instructors: []
};

const SAMPLE_SCRAPED_SECTION: ISectionDetails = {
	title: 'Intro to Programming',
	description: 'An introduction to programming',
	prereqs: null,
	semestersOffered: [],
	instructors: []
};

describe('Section details scrape processor', () => {
	it('runs without errors', async () => {
		mockSectionFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });
	});

	it('updates instructors', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			instructors: ['Leo Ureel']
		});

		mockInstructorFindMany.mockResolvedValue([{id: 1}]);

		await processJob(null as any, () => { /* empty callback */ });

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

		mockInstructorFindMany.mockResolvedValue([{id: 1}]);

		await processJob(null as any, () => { /* empty callback */ });

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

		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

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

		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				description: SAMPLE_SCRAPED_SECTION.description
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

		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpdate).toHaveBeenCalledTimes(0);
	});

	it('updates course prereqs', async () => {
		mockSectionFindMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		mockSectionFindMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			description: ''
		});

		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockCourseUpdate.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				prereqs: SAMPLE_SCRAPED_SECTION.prereqs
			}
		});
	});

	afterEach(() => {
		mockCourseUpdate.mockClear();
		mockSectionFindMany.mockClear();
		mockSectionUpdate.mockClear();
		mockInstructorFindMany.mockClear();
	});
});
