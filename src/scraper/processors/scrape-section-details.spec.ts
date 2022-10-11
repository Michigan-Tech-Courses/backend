import {mocked} from 'ts-jest/utils';
import type {ISectionDetails} from '@mtucourses/scraper';
import {ESemester, getSectionDetails} from '@mtucourses/scraper';

import type {Building, Course, Section} from '@prisma/client';
import {LocationType, Semester} from '@prisma/client';
import {COURSE} from 'test/test-data';
import {Test} from '@nestjs/testing';
import {PrismaModule} from 'src/prisma/prisma.module';
import {PrismaService} from 'src/prisma/prisma.service';
import {ScrapeSectionDetailsTask} from './scrape-section-details';

// Scraper mock
jest.mock('@mtucourses/scraper');
const mockedSectionDetailScraper = mocked(getSectionDetails, true);

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
	courseId: COURSE.id,
	course: COURSE,
	instructors: [],
	locationType: LocationType.PHYSICAL,
	buildingName: 'Fisher Hall',
	room: '121'
};

const SAMPLE_SCRAPED_SECTION: ISectionDetails = {
	title: 'Intro to Programming',
	description: 'An introduction to programming',
	prereqs: null,
	semestersOffered: [],
	instructors: [],
	location: 'Fisher Hall 121',
	credits: 3
};

const SAMPLE_BUILDING1: Building = {
	name: 'Fisher Hall',
	shortName: 'Fisher',
	lat: 0,
	lon: 0
};

const SAMPLE_BUILDING2: Building = {
	name: 'Rekhi',
	shortName: 'Rekhi',
	lat: 0,
	lon: 0
};

describe('Section details scrape processor', () => {
	let task: ScrapeSectionDetailsTask;

	const prismaMock = {
		$queryRaw: jest.fn(),
		course: {
			update: jest.fn()
		},
		section: {
			findMany: jest.fn(),
			update: jest.fn()
		},
		instructor: {
			create: jest.fn(),
			findMany: jest.fn()
		},
		building: {
			findMany: jest.fn()
		}
	};

	beforeEach(async () => {
		prismaMock.building.findMany.mockResolvedValueOnce([SAMPLE_BUILDING1, SAMPLE_BUILDING2]);

		const module = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ScrapeSectionDetailsTask]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		task = module.get(ScrapeSectionDetailsTask);
	});

	afterEach(() => {
		prismaMock.$queryRaw.mockClear();
		prismaMock.course.update.mockClear();
		prismaMock.section.findMany.mockClear();
		prismaMock.section.update.mockClear();
		prismaMock.instructor.create.mockClear();
		prismaMock.instructor.findMany.mockClear();
		prismaMock.building.findMany.mockClear();
	});

	it('runs without errors', async () => {
		prismaMock.section.findMany.mockResolvedValue([]);

		await task.handler();
	});

	it('updates location', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			location: 'Online Instruction'
		});

		prismaMock.instructor.findMany.mockResolvedValue([{id: 1}]);

		await task.handler();

		expect(prismaMock.section.update.mock.calls[0][0]).toEqual({
			where: {
				id: SAMPLE_SECTION.id
			},
			data: {
				locationType: LocationType.ONLINE,
				building: {
					disconnect: true
				},
				room: null
			}
		});
	});

	it('updates location (2)', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			location: 'Rekhi 0200'
		});

		prismaMock.instructor.findMany.mockResolvedValue([{id: 1}]);

		await task.handler();

		expect(prismaMock.section.update.mock.calls[0][0]).toEqual({
			where: {
				id: SAMPLE_SECTION.id
			},
			data: {
				locationType: LocationType.PHYSICAL,
				building: {
					connect: {
						name: 'Rekhi'
					}
				},
				room: '0200'
			}
		});
	});

	it('updates instructors', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			instructors: ['Leo Ureel']
		});

		prismaMock.instructor.findMany.mockResolvedValue([{id: 1}]);

		await task.handler();

		expect(prismaMock.section.update.mock.calls[0][0]).toEqual({
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
		prismaMock.section.findMany.mockResolvedValueOnce([
			{
				...SAMPLE_SECTION,
				instructors: [{
					id: 1
				}]
			}
		]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			instructors: ['Leo Ureel']
		});

		prismaMock.instructor.findMany.mockResolvedValue([{id: 1}]);

		await task.handler();

		expect(prismaMock.section.update).toBeCalledTimes(0);
	});

	it('disconnects removed instructor', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([
			{
				...SAMPLE_SECTION,
				instructors: [{
					id: 1
				}]
			}
		]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue(SAMPLE_SCRAPED_SECTION);

		prismaMock.instructor.findMany.mockResolvedValue([]);

		await task.handler();

		expect(prismaMock.section.update.mock.calls[0][0]).toEqual({
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
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue(SAMPLE_SCRAPED_SECTION);

		await task.handler();

		expect(prismaMock.course.update.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				description: SAMPLE_SCRAPED_SECTION.description,
				offered: [],
				prereqs: null
			}
		});
	});

	it('doesn\'t update course description if unchanged', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			description: '',
			prereqs: COURSE.prereqs
		});

		await task.handler();

		expect(prismaMock.section.update).toHaveBeenCalledTimes(0);
	});

	it('updates course prereqs', async () => {
		const storedSection: Section & {course: Course} = {
			...SAMPLE_SECTION,
			course: {
				...SAMPLE_SECTION.course,
				prereqs: 'High School'
			}
		};

		prismaMock.section.findMany.mockResolvedValueOnce([storedSection]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			description: ''
		});

		await task.handler();

		expect(prismaMock.course.update.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				prereqs: SAMPLE_SCRAPED_SECTION.prereqs,
				offered: [],
				description: ''
			}
		});
	});

	it('updates course offered semesters', async () => {
		prismaMock.section.findMany.mockResolvedValueOnce([SAMPLE_SECTION]);
		prismaMock.section.findMany.mockResolvedValue([]);

		mockedSectionDetailScraper.mockResolvedValue({
			...SAMPLE_SCRAPED_SECTION,
			semestersOffered: [ESemester.fall]
		});

		await task.handler();

		expect(prismaMock.course.update.mock.calls[0][0]).toEqual({
			where: expect.any(Object),
			data: {
				prereqs: SAMPLE_SCRAPED_SECTION.prereqs,
				offered: [Semester.FALL],
				description: SAMPLE_SCRAPED_SECTION.description
			}
		});
	});
});
