import {mocked} from 'ts-jest/utils';
import ratings, {ITeacherFromSearch, ITeacherPage} from '@mtucourses/rate-my-professors';
import {Test} from '@nestjs/testing';
import {PrismaService} from 'src/prisma/prisma.service';
import {PrismaModule} from 'src/prisma/prisma.module';
import {ScrapeRateMyProfessorsTask} from './scrape-ratemyprofessors';
import {Instructor} from '@prisma/client';

jest.mock('@mtucourses/rate-my-professors');
const mockedSearchSchool = mocked(ratings.searchSchool);
const mockedSearchTeacher = mocked(ratings.searchTeacher);
const mockedGetTeacher = mocked(ratings.getTeacher);

const mockInstructorUpdate = jest.fn();
const mockInstructorFindMany = jest.fn();

mockedSearchSchool.mockResolvedValue([{
	city: 'Houghton',
	id: 'U2Nob29sLTYwMg==',
	name: 'Michigan Technological University',
	state: 'MI'
}]);

describe('Rate My Professor scrape processor', () => {
	let task: ScrapeRateMyProfessorsTask;

	const prismaMock = {
		instructor: {
			update: mockInstructorUpdate,
			findMany: mockInstructorFindMany
		}
	};

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ScrapeRateMyProfessorsTask]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		task = module.get(ScrapeRateMyProfessorsTask);
	});

	afterEach(() => {
		prismaMock.instructor.update.mockClear();
		prismaMock.instructor.findMany.mockClear();
	});

	it('runs without errors', async () => {
		mockInstructorFindMany.mockResolvedValue([]);

		await task.handler();
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

		await task.handler();

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
			// Different from scraped value
			numRatings: 8,
			rmpId: 'test-id',
			updatedAt: new Date(),
			deletedAt: new Date()
		};

		mockedSearchTeacher.mockResolvedValue([searchResult]);
		mockedGetTeacher.mockResolvedValue(teacher);
		mockInstructorFindMany.mockResolvedValue([instructor]);

		await task.handler();

		expect(mockInstructorUpdate).toHaveBeenCalledTimes(1);
	});
});
