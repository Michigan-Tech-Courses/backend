// @ts-nochecka
import {mocked} from 'ts-jest/utils';
import {getAllFaculty, IFaculty} from '@mtucourses/scrapper';

jest.mock('@mtucourses/scrapper');
const mockedFacultyScrapper = mocked(getAllFaculty, true);

const mockInstructorUpsert = jest.fn();

const mockedPrisma = jest.fn().mockImplementation(() => ({
	$connect: jest.fn(),
	$disconnect: jest.fn(),
	instructor: {
		upsert: mockInstructorUpsert
	}
}));

jest.mock('@prisma/client', () => ({
	PrismaClient: mockedPrisma
}));

import processJob from './scrape-instructors';

describe('Instructor scrape processor', () => {
	it('runs without errors', async () => {
		mockedFacultyScrapper.mockResolvedValue([]);

		await processJob(null, () => { /* empty callback */ });
	});

	it('inserts results into the database', async () => {
		const instructor: IFaculty = {
			name: 'Gorkem Asilioglu',
			department: 'Computer Science',
			email: 'galolu@mtu.edu',
			phone: '906-487-1643',
			office: 'Rekhi Hall 308',
			websiteURL: 'http://pages.mtu.edu/~galolu',
			interests: [],
			occupations: [],
			photoURL: null
		};

		mockedFacultyScrapper.mockResolvedValue([instructor]);

		await processJob(null, () => { /* empty callback */ });

		// eslint-disable-next-line unused-imports/no-unused-vars-ts
		const {name, photoURL, ...namelessInstructor} = instructor;
		const normalizedInstructor = {...namelessInstructor, fullName: instructor.name};

		expect(mockInstructorUpsert).toHaveBeenCalledWith({
			create: normalizedInstructor,
			update: normalizedInstructor,
			where: {
				fullName: instructor.name
			}
		});
	});

	afterEach(() => {
		mockedFacultyScrapper.mockClear();
		mockedPrisma.mockClear();
		mockInstructorUpsert.mockClear();
	});
});
