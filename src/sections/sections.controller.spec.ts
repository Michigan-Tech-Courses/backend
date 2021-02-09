import {Test, TestingModule} from '@nestjs/testing';
import {Section, Semester} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {SectionsController} from './sections.controller';
import {SectionsModule} from './sections.module';

describe('SectionsController', () => {
	let controller: SectionsController;

	const prismaMock = {
		course: {
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
		prismaMock.course.findMany.mockResolvedValue([{sections: [section]}]);

		expect(await controller.getAllSections()).toStrictEqual([section]);
	});

	it('should only return updated sections', async () => {
		prismaMock.course.findMany.mockResolvedValue([]);

		const now = new Date();

		expect(await controller.getAllSections({updatedSince: now, year: 2020, semester: Semester.FALL})).toStrictEqual([]);

		expect(prismaMock.course.findMany).toHaveBeenCalledWith({
			where: {
				OR: [
					{semester: Semester.FALL, year: 2020, sections: {every: {OR: [{updatedAt: {gt: now}}, {deletedAt: {gt: now}}]}}, updatedAt: {gt: now}},
					{semester: Semester.FALL, year: 2020, sections: {every: {OR: [{updatedAt: {gt: now}}, {deletedAt: {gt: now}}]}}, deletedAt: {gt: now}}
				]
			},
			select: {
				sections: {
					include: {
						instructors: {
							select: {
								id: true
							}
						}
					}
				}
			}
		});
	});

	afterEach(() => {
		prismaMock.course.findMany.mockClear();
	});
});
