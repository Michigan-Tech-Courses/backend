import {mocked} from 'ts-jest/utils';
import ratings from '@mtucourses/rate-my-professors';

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

describe('Rate My Professor scrape processor', () => {
	it('runs without errors', async () => {
		mockInstructorFindMany.mockResolvedValue([]);

		await processJob(null, () => { /* empty callback */ });
	});

	// It('inserts results into the database', async () => {
	// 	const instructor: IFaculty = {
	// 		name: 'Gorkem Asilioglu',
	// 		departments: ['Computer Science'],
	// 		email: 'galolu@mtu.edu',
	// 		phone: '906-487-1643',
	// 		office: 'Rekhi Hall 308',
	// 		websiteURL: 'http://pages.mtu.edu/~galolu',
	// 		interests: [],
	// 		occupations: [],
	// 		photoURL: null
	// 	};

	// 	mockedFacultyScrapper.mockResolvedValue([instructor]);

	// 	mockInstructorFindUnique.mockResolvedValue(null);

	// 	await processJob(null, () => { /* empty callback */ });

	// 	// eslint-disable-next-line unused-imports/no-unused-vars-ts
	// 	const {name, ...namelessInstructor} = instructor;
	// 	const normalizedInstructor = {...namelessInstructor, fullName: instructor.name};

	// 	expect(mockInstructorUpsert).toHaveBeenCalledWith({
	// 		create: normalizedInstructor,
	// 		update: normalizedInstructor,
	// 		where: {
	// 			fullName: instructor.name
	// 		}
	// 	});
	// });

	// it('does not update instructor if equal', async () => {
	// 	const instructor: IFaculty = {
	// 		name: 'Gorkem Asilioglu',
	// 		departments: ['Computer Science'],
	// 		email: 'galolu@mtu.edu',
	// 		phone: '906-487-1643',
	// 		office: 'Rekhi Hall 308',
	// 		websiteURL: 'http://pages.mtu.edu/~galolu',
	// 		interests: [],
	// 		occupations: [],
	// 		photoURL: null
	// 	};

	// 	const storedInstructor: Instructor = {
	// 		fullName: instructor.name,
	// 		...instructor,
	// 		id: 0,
	// 		updatedAt: new Date(),
	// 		deletedAt: new Date(),
	// 		photoURL: null
	// 	};

	// 	mockedFacultyScrapper.mockResolvedValue([instructor]);

	// 	mockInstructorFindUnique.mockResolvedValue(storedInstructor);

	// 	await processJob(null, () => { /* empty callback */ });

	// 	expect(mockInstructorUpsert).toHaveBeenCalledTimes(0);
	// });

	// it('updates instructor if not equal', async () => {
	// 	const instructor: IFaculty = {
	// 		name: 'Gorkem Asilioglu',
	// 		departments: ['Computer Science'],
	// 		email: 'galolu@mtu.edu',
	// 		phone: '906-487-1643',
	// 		office: 'Rekhi Hall 308',
	// 		websiteURL: 'http://pages.mtu.edu/~galolu',
	// 		interests: [],
	// 		occupations: [],
	// 		photoURL: 'http://url-to-new-photo'
	// 	};

	// 	const storedInstructor: Instructor = {
	// 		fullName: instructor.name,
	// 		...instructor,
	// 		id: 0,
	// 		updatedAt: new Date(),
	// 		deletedAt: new Date(),
	// 		photoURL: null
	// 	};

	// 	mockedFacultyScrapper.mockResolvedValue([instructor]);

	// 	mockInstructorFindUnique.mockResolvedValue(storedInstructor);

	// 	await processJob(null, () => { /* empty callback */ });

	// 	expect(mockInstructorUpsert).toHaveBeenCalledTimes(1);
	// });

	afterEach(() => {
		mockedSearchTeacher.mockClear();
		mockedGetTeacher.mockClear();
		mockedPrisma.mockClear();
		mockInstructorUpdate.mockClear();
		mockInstructorFindMany.mockClear();
	});
});
