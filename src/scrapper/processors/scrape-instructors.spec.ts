import {mocked} from 'ts-jest/utils';
import {getAllFaculty, IFaculty} from '@mtucourses/scrapper';

jest.mock('@mtucourses/scrapper');
const mockedFacultyScrapper = mocked(getAllFaculty, true);

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
		mockedFacultyScrapper.mockResolvedValue([]);

		await processJob(null, () => { /* empty callback */ });
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

		mockedFacultyScrapper.mockResolvedValue([instructor]);

		mockInstructorFindUnique.mockResolvedValue(null);

		await processJob(null, () => { /* empty callback */ });

		// eslint-disable-next-line unused-imports/no-unused-vars-ts
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
			photoURL: null
		};

		mockedFacultyScrapper.mockResolvedValue([instructor]);

		mockInstructorFindUnique.mockResolvedValue(storedInstructor);

		await processJob(null, () => { /* empty callback */ });

		expect(mockInstructorUpsert).toHaveBeenCalledTimes(0);
	});

	afterEach(() => {
		mockedFacultyScrapper.mockClear();
		mockedPrisma.mockClear();
		mockInstructorUpsert.mockClear();
		mockInstructorFindUnique.mockClear();
	});
});
