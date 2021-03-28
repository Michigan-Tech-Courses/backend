import {mocked} from 'ts-jest/utils';
import {getAllTransferCourses, ITransferCourse} from '@mtucourses/scraper';
import {Except} from 'type-fest';

jest.mock('@mtucourses/scraper');
const mockedTransferScraper = mocked(getAllTransferCourses, true);

const mockTransferCourseUpsert = jest.fn();
const mockTransferCourseFindUnique = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	transferCourse: {
		upsert: mockTransferCourseUpsert,
		findUnique: mockTransferCourseFindUnique
	}
}));

jest.mock('@prisma/client', () => ({
	PrismaClient: mockedPrisma
}));

import {TransferCourse} from '@prisma/client';
import processJob from './scrape-transfer-courses';

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

const SAMPLE_SAVED_COURSE: Except<TransferCourse, 'id'> = {
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
	it('runs without errors', async () => {
		mockedTransferScraper.mockResolvedValue([]);

		await processJob();
	});

	it('inserts results into the database', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindUnique.mockResolvedValue(null);

		await processJob();

		expect(mockTransferCourseUpsert).toHaveBeenCalledWith({
			create: SAMPLE_SAVED_COURSE,
			update: SAMPLE_SAVED_COURSE,
			where: expect.any(Object)
		});
	});

	it('does not update if equal', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindUnique.mockResolvedValue({...SAMPLE_SAVED_COURSE, id: 'test-id'});

		await processJob();

		expect(mockTransferCourseUpsert).toHaveBeenCalledTimes(0);
	});

	it('updates if not equal', async () => {
		mockedTransferScraper.mockResolvedValue([SAMPLE_COURSE]);

		mockTransferCourseFindUnique.mockResolvedValue({...SAMPLE_SAVED_COURSE, title: 'A Different Title', id: 'test-id'});

		await processJob();

		expect(mockTransferCourseUpsert).toHaveBeenCalledTimes(1);
	});

	afterEach(() => {
		mockedTransferScraper.mockClear();
		mockedPrisma.mockClear();
		mockTransferCourseUpsert.mockClear();
		mockTransferCourseFindUnique.mockClear();
	});
});
