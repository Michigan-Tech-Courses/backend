import {mocked} from 'ts-jest/utils';
import type {ITransferCourse} from '@mtucourses/scraper';
import {getAllTransferCourses} from '@mtucourses/scraper';
import type {Except} from 'type-fest';
import type {TransferCourse} from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScrapeTransferCoursesTask } from './scrape-transfer-courses';

jest.mock('@mtucourses/scraper');
const mockedTransferScraper = mocked(getAllTransferCourses, true);

const mockTransferCourseUpsert = jest.fn();
const mockTransferCourseFindUnique = jest.fn();
const mockTransferCourseDeleteMany = jest.fn();
const mockTransferCourseFindMany = jest.fn();

const SAMPLE_COURSE: ITransferCourse = {
	from: {
		college: 'UNIV OF ALABAMA HUNTSVILLE',
		state: 'AL',
		credits: 3,
		crse: '100',
		subject: 'MU'
	},
	to: {
		credits: 3,
		crse: '1000',
		subject: 'MUS',
		title: 'Music Appreciation'
	}
};

const SAMPLE_SAVED_COURSE: Except<TransferCourse, 'id' | 'updatedAt'> = {
	fromCollege: SAMPLE_COURSE.from.college,
	fromCollegeState: SAMPLE_COURSE.from.state,
	fromCRSE: SAMPLE_COURSE.from.crse,
	fromCredits: SAMPLE_COURSE.from.credits,
	fromSubject: SAMPLE_COURSE.from.subject,
	toCRSE: SAMPLE_COURSE.to.crse,
	toCredits: SAMPLE_COURSE.to.credits,
	toSubject: SAMPLE_COURSE.to.subject,
	title: SAMPLE_COURSE.to.title
};

describe('Transfer course scrape processor', () => {
	let task: ScrapeTransferCoursesTask;

	const prismaMock = {
		$connect: jest.fn(),
		$disconnect: jest.fn(),
		transferCourse: {
			upsert: mockTransferCourseUpsert,
			findUnique: mockTransferCourseFindUnique,
			deleteMany: mockTransferCourseDeleteMany,
			findMany: mockTransferCourseFindMany
		}
	}

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ScrapeTransferCoursesTask]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		task = module.get(ScrapeTransferCoursesTask);
	});

	afterEach(() => {
		mockedTransferScraper.mockClear();
		mockTransferCourseUpsert.mockClear();
		mockTransferCourseFindUnique.mockClear();
		mockTransferCourseDeleteMany.mockClear();
		mockTransferCourseFindMany.mockClear();
	});

	it('runs without errors', async () => {
		mockedTransferScraper.mockResolvedValue([]);
		mockTransferCourseFindMany.mockResolvedValue([]);

		await task.handler();
	});

	it('inserts results into the database', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindMany.mockResolvedValue([]);
		mockTransferCourseFindUnique.mockResolvedValue(null);

		await task.handler();

		expect(mockTransferCourseUpsert).toHaveBeenCalledWith({
			create: SAMPLE_SAVED_COURSE,
			update: SAMPLE_SAVED_COURSE,
			where: expect.any(Object)
		});
	});

	it('does not update if equal', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindUnique.mockResolvedValue({...SAMPLE_SAVED_COURSE, id: 'test-id'});

		await task.handler();

		expect(mockTransferCourseUpsert).toHaveBeenCalledTimes(0);
	});

	it('updates if not equal', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindUnique.mockResolvedValue({...SAMPLE_SAVED_COURSE, title: 'A Different Title', id: 'test-id'});

		await task.handler();

		expect(mockTransferCourseUpsert).toHaveBeenCalledTimes(1);
	});

	it('deletes stale courses', async () => {
		mockedTransferScraper.mockResolvedValue([]);

		const savedCourse = {...SAMPLE_SAVED_COURSE, title: 'A Different Title', id: 'test-id'};

		mockTransferCourseFindMany.mockResolvedValue([savedCourse]);
		mockTransferCourseFindUnique.mockResolvedValue(savedCourse);

		await task.handler();

		expect(mockTransferCourseDeleteMany).toHaveBeenCalledWith({
			where: {
				id: {
					in: ['test-id']
				}
			}
		});
	});
});