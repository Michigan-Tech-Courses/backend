import {Test, TestingModule} from '@nestjs/testing';
import {Instructor} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {InstructorsController} from './instructors.controller';
import {InstructorsModule} from './instructors.module';

describe('InstructorsController', () => {
	let controller: InstructorsController;

	const prismaMock = {
		instructor: {
			findMany: jest.fn()
		}
	};

	const instructor: Instructor = {
		fullName: 'Gorkem Asilioglu',
		departments: ['Computer Science'],
		email: 'galolu@mtu.edu',
		phone: '906-487-1643',
		office: 'Rekhi Hall 308',
		websiteURL: 'http://pages.mtu.edu/~galolu',
		interests: [],
		occupations: [],
		photoURL: null,
		id: 0,
		updatedAt: new Date(),
		deletedAt: new Date(),
		averageDifficultyRating: null,
		averageRating: null,
		numRatings: null,
		rmpId: null
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [InstructorsModule]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		controller = module.get<InstructorsController>(InstructorsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should return all instructors', async () => {
		prismaMock.instructor.findMany.mockResolvedValue([instructor]);

		const {photoURL, ...instructorWithoutPhoto} = instructor;

		expect(await controller.getAllInstructors()).toStrictEqual([{...instructorWithoutPhoto, thumbnailURL: null}]);
	});

	it('should only return updated instructors', async () => {
		prismaMock.instructor.findMany.mockResolvedValue([]);

		const now = new Date();

		expect(await controller.getAllInstructors({updatedSince: now})).toStrictEqual([]);
		expect(prismaMock.instructor.findMany).toHaveBeenCalledWith({
			where: {
				OR: [
					{
						updatedAt: {
							gt: now
						}
					},
					{
						deletedAt: {
							gt: now
						}
					}
				]
			}
		});
	});

	afterEach(() => {
		prismaMock.instructor.findMany.mockClear();
	});
});
