import {Test, TestingModule} from '@nestjs/testing';
import {Semester} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {COURSE} from 'test/test-data';
import {CoursesController} from './courses.controller';
import {CoursesModule} from './courses.module';

describe('CoursesController', () => {
	let controller: CoursesController;

	const prismaMock = {
		course: {
			findMany: jest.fn()
		}
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [CoursesModule]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		controller = module.get<CoursesController>(CoursesController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should return all courses', async () => {
		prismaMock.course.findMany.mockResolvedValue([COURSE]);

		expect(await controller.getAllCourses()).toStrictEqual([COURSE]);
	});

	it('should only return updated courses', async () => {
		prismaMock.course.findMany.mockResolvedValue([]);

		const now = new Date();

		expect(await controller.getAllCourses({updatedSince: now, year: 2020, semester: Semester.FALL})).toStrictEqual([]);
		expect(prismaMock.course.findMany).toHaveBeenCalledWith({
			where: {
				OR: [
					{
						year: 2020,
						semester: Semester.FALL,
						updatedAt: {
							gt: now
						}
					},
					{
						year: 2020,
						semester: Semester.FALL,
						deletedAt: {
							gt: now
						}
					}
				]
			}
		});
	});

	it('should return all unique courses', async () => {
		prismaMock.course.findMany.mockResolvedValue([COURSE]);

		expect(await controller.getAllCourses()).toStrictEqual([COURSE]);
	});

	afterEach(() => {
		prismaMock.course.findMany.mockClear();
	});
});
