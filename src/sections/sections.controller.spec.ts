import {Test, TestingModule} from '@nestjs/testing';
import {Section} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {SectionsController} from './sections.controller';
import {SectionsModule} from './sections.module';

describe('SectionsController', () => {
	let controller: SectionsController;

	const prismaMock = {
		section: {
			findMany: jest.fn()
		}
	};

	const section: Section = {
		id: 'test-id',
		courseId: 'test-course-id',
		crn: 'test-crn',
		section: '0A',
		cmp: '1',
		minCredits: 0,
		maxCredits: 3,
		time: {},
		totalSeats: 10,
		takenSeats: 5,
		availableSeats: 5,
		fee: 0,
		updatedAt: new Date(),
		deletedAt: null
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [SectionsModule]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		controller = module.get<SectionsController>(SectionsController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should return all sections', async () => {
		prismaMock.section.findMany.mockResolvedValue([section]);

		expect(await controller.getAllSections()).toStrictEqual([section]);
	});

	it('should only return updated sections', async () => {
		prismaMock.section.findMany.mockResolvedValue([]);

		const now = new Date();

		expect(await controller.getAllSections({updatedSince: now})).toStrictEqual([]);
		expect(prismaMock.section.findMany).toHaveBeenCalledWith({
			include: {
				instructors: {
					select: {
						id: true
					}
				}
			},
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
		prismaMock.section.findMany.mockClear();
	});
});
