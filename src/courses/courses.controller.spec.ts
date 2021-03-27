import {Test, TestingModule} from '@nestjs/testing';
import {Course, Semester} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {CoursesController} from './courses.controller';
import {CoursesModule} from './courses.module';

describe('CoursesController', () => {
	let controller: CoursesController;

	const prismaMock = {
		course: {
			findMany: jest.fn()
		}
	};

	const course: Course = {
		id: 'test-course',
		year: 2020,
		semester: Semester.FALL,
		subject: 'CS',
		crse: '1000',
		title: 'Intro to Programming',
		description: '',
		prereqs: null,
		updatedAt: new Date(),
		deletedAt: null,
		offered: []
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
		prismaMock.course.findMany.mockResolvedValue([course]);

		expect(await controller.getAllCourses()).toStrictEqual([course]);
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

	afterEach(() => {
		prismaMock.course.findMany.mockClear();
	});
});
