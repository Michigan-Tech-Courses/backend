import {mocked} from 'ts-jest/utils';
import {getAllFaculty, IFaculty} from '@mtucourses/scraper';

jest.mock('@mtucourses/scraper');
const mockedFacultyScraper = mocked(getAllFaculty, true);

const mockInstructorUpsert = jest.fn();
const mockInstructorFindUnique = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	instructor: {
		upsert: mockInstructorUpsert,
		findUnique: mockInstructorFindUnique
	}
}));

jest.mock('@prisma/client', () => ({
	PrismaClient: mockedPrisma
}));

import {Instructor} from '@prisma/client';
import processJob from './scrape-instructors';

describe('Instructor scrape processor', () => {
	it('runs without errors', async () => {
		mockedFacultyScraper.mockResolvedValue([]);

		await processJob(null as any, () => { /* empty callback */ });
	});

	it('inserts results into the database', async () => {
		const instructor: IFaculty = {
			name: 'Gorkem Asilioglu',
			departments: ['Computer Science'],
			email: 'galolu@mtu.edu',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			interests: [],
			occupations: [],
			photoURL: null
		};

		mockedFacultyScraper.mockResolvedValue([instructor]);

		mockInstructorFindUnique.mockResolvedValue(null);

		await processJob(null as any, () => { /* empty callback */ });

		const {name, ...namelessInstructor} = instructor;
		const normalizedInstructor = {...namelessInstructor, fullName: instructor.name};

		expect(mockInstructorUpsert).toHaveBeenCalledWith({
			create: normalizedInstructor,
			update: normalizedInstructor,
			where: {
				fullName: instructor.name
			}
		});
	});

	it('does not update instructor if equal', async () => {
		const instructor: IFaculty = {
			name: 'Gorkem Asilioglu',
			departments: ['Computer Science'],
			email: 'galolu@mtu.edu',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			interests: [],
			occupations: [],
			photoURL: null
		};

		const storedInstructor: Instructor = {
			fullName: instructor.name,
			...instructor,
			id: 0,
			updatedAt: new Date(),
			deletedAt: new Date(),
			photoURL: null,
			averageDifficultyRating: null,
			averageRating: null,
			numRatings: null,
			rmpId: null
		};

		mockedFacultyScraper.mockResolvedValue([instructor]);

		mockInstructorFindUnique.mockResolvedValue(storedInstructor);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockInstructorUpsert).toHaveBeenCalledTimes(0);
	});

	it('updates instructor if not equal', async () => {
		const instructor: IFaculty = {
			name: 'Gorkem Asilioglu',
			departments: ['Computer Science'],
			email: 'galolu@mtu.edu',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			interests: [],
			occupations: [],
			photoURL: 'http://url-to-new-photo'
		};

		const storedInstructor: Instructor = {
			fullName: instructor.name,
			...instructor,
			id: 0,
			updatedAt: new Date(),
			deletedAt: new Date(),
			photoURL: null,
			averageDifficultyRating: null,
			averageRating: null,
			numRatings: null,
			rmpId: null
		};

		mockedFacultyScraper.mockResolvedValue([instructor]);

		mockInstructorFindUnique.mockResolvedValue(storedInstructor);

		await processJob(null as any, () => { /* empty callback */ });

		expect(mockInstructorUpsert).toHaveBeenCalledTimes(1);
	});

	afterEach(() => {
		mockedFacultyScraper.mockClear();
		mockedPrisma.mockClear();
		mockInstructorUpsert.mockClear();
		mockInstructorFindUnique.mockClear();
	});
});
