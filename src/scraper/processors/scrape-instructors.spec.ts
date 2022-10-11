import {mocked} from 'ts-jest/utils';
import type {Instructor} from '@prisma/client';
import type {IFaculty} from '@mtucourses/scraper';
import {getAllFaculty} from '@mtucourses/scraper';
import {Test} from '@nestjs/testing';
import {PrismaService} from 'src/prisma/prisma.service';
import {PrismaModule} from 'src/prisma/prisma.module';
import {ScrapeInstructorsTask} from './scrape-instructors';

jest.mock('@mtucourses/scraper');
const mockedFacultyScraper = mocked(getAllFaculty, true);

describe('Instructor scrape processor', () => {
	let task: ScrapeInstructorsTask;

	const prismaMock = {
		instructor: {
			upsert: jest.fn(),
			findUnique: jest.fn()
		}
	};

	beforeEach(async () => {
		const module = await Test.createTestingModule({
			imports: [PrismaModule],
			providers: [ScrapeInstructorsTask]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		task = module.get(ScrapeInstructorsTask);
	});

	afterEach(() => {
		prismaMock.instructor.upsert.mockClear();
		prismaMock.instructor.findUnique.mockClear();
	});

	it('runs without errors', async () => {
		mockedFacultyScraper.mockResolvedValue([]);

		await task.handler();
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

		prismaMock.instructor.findUnique.mockResolvedValue(null);

		await task.handler();

		const {name, ...namelessInstructor} = instructor;
		const normalizedInstructor = {...namelessInstructor, fullName: instructor.name};

		expect(prismaMock.instructor.upsert).toHaveBeenCalledWith({
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

		prismaMock.instructor.findUnique.mockResolvedValue(storedInstructor);

		await task.handler();

		expect(prismaMock.instructor.upsert).toHaveBeenCalledTimes(0);
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

		prismaMock.instructor.findUnique.mockResolvedValue(storedInstructor);

		await task.handler();

		expect(prismaMock.instructor.upsert).toHaveBeenCalledTimes(1);
	});
});
