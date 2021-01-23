import {mocked} from 'ts-jest/utils';
import ratings, {ITeacherFromSearch, ITeacherPage} from '@mtucourses/rate-my-professors';

jest.mock('@mtucourses/rate-my-professors');
const mockedSearchTeacher = mocked(ratings.searchTeacher);
const mockedGetTeacher = mocked(ratings.getTeacher);

const mockInstructorUpdate = jest.fn();
const mockInstructorFindMany = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	instructor: {
		update: mockInstructorUpdate,
		findMany: mockInstructorFindMany
	}
}));

jest.mock('@prisma/client', () => ({
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-ratemyprofessors';
import {Instructor} from '@prisma/client';

describe('Rate My Professor scrape processor', () => {
	it('runs without errors', async () => {
		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null, () => { /* empty callback */ });
	});

	it('does not update instructor if equal', async () => {
		const searchResult: ITeacherFromSearch = {
			id: 'test-id',
			firstName: 'Hello',
			lastName: 'World',
			school: {
				id: 'test-school',
				name: 'A Test School'
			}
		};

		const teacher: ITeacherPage = {
			id: 'test-id',
			firstName: 'Hello',
			lastName: 'World',
			numRatings: 10,
			avgDifficulty: 5,
			avgRating: 5,
			department: 'CS',
			school: {
				id: 'test-school',
				name: 'A Test School',
				city: 'Houghton',
				state: 'Michigan'
			}
		};

		const instructor: Instructor = {
			id: 0,
			fullName: 'Hello World',
			departments: [],
			interests: [],
			email: 'test@example.com',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			occupations: [],
			photoURL: null,
			averageDifficultyRating: 1,
			averageRating: 1,
			numRatings: 10,
			rmpId: 'test-id',
			updatedAt: new Date(),
			deletedAt: new Date()
		};

		mockedSearchTeacher.mockResolvedValue([searchResult]);
		mockedGetTeacher.mockResolvedValue(teacher);
		mockInstructorFindMany.mockResolvedValue([instructor]);

		await processJob(null, () => { /* empty callback */ });

		expect(mockInstructorUpdate).toHaveBeenCalledTimes(0);
	});

	it('updates instructor if not equal', async () => {
		const searchResult: ITeacherFromSearch = {
			id: 'test-id',
			firstName: 'Hello',
			lastName: 'World',
			school: {
				id: 'test-school',
				name: 'A Test School'
			}
		};

		const teacher: ITeacherPage = {
			id: 'test-id',
			firstName: 'Hello',
			lastName: 'World',
			numRatings: 10,
			avgDifficulty: 5,
			avgRating: 5,
			department: 'CS',
			school: {
				id: 'test-school',
				name: 'A Test School',
				city: 'Houghton',
				state: 'Michigan'
			}
		};

		const instructor: Instructor = {
			id: 0,
			fullName: 'Hello World',
			departments: [],
			interests: [],
			email: 'test@example.com',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			occupations: [],
			photoURL: null,
			averageDifficultyRating: 1,
			averageRating: 1,
			// Different from scrapped value
			numRatings: 8,
			rmpId: 'test-id',
			updatedAt: new Date(),
			deletedAt: new Date()
		};

		mockedSearchTeacher.mockResolvedValue([searchResult]);
		mockedGetTeacher.mockResolvedValue(teacher);
		mockInstructorFindMany.mockResolvedValue([instructor]);

		await processJob(null, () => { /* empty callback */ });

		expect(mockInstructorUpdate).toHaveBeenCalledTimes(1);
	});

	afterEach(() => {
		mockedSearchTeacher.mockClear();
		mockedGetTeacher.mockClear();
		mockedPrisma.mockClear();
		mockInstructorUpdate.mockClear();
		mockInstructorFindMany.mockClear();
	});
});
