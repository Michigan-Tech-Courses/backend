import type {TestingModule} from '@nestjs/testing';
import {Test} from '@nestjs/testing';
import type {PassFailDrop} from '@prisma/client';
import {Semester} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {PassFailDropController} from './passfaildrop.controller';
import {PassFailDropModule} from './passfaildrop.module';

describe('PassFailDropController', () => {
	let controller: PassFailDropController;

	const prismaMock = {
		passFailDrop: {
			groupBy: jest.fn()
		}
	};

	const record: PassFailDrop = {
		courseSubject: 'CS',
		courseCrse: '1000',
		year: 2020,
		semester: Semester.FALL,
		section: '0A',
		failed: 0,
		dropped: 0,
		total: 10
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [PassFailDropModule]
		})
			.overrideProvider(PrismaService)
			.useValue(prismaMock)
			.compile();

		controller = module.get<PassFailDropController>(PassFailDropController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

	it('should return all records', async () => {
		prismaMock.passFailDrop.groupBy.mockResolvedValue([{
			courseSubject: record.courseSubject,
			courseCrse: record.courseCrse,
			year: record.year,
			semester: record.semester,
			_avg: {
				dropped: record.dropped,
				failed: record.failed,
				total: record.total
			}
		}]);

		expect(await controller.getAll()).toStrictEqual({
			[`${record.courseSubject}${record.courseCrse}`]: [{
				dropped: record.dropped,
				failed: record.failed,
				total: record.total,
				semester: record.semester,
				year: record.year
			}]
		});
	});

	afterEach(() => {
		prismaMock.passFailDrop.groupBy.mockClear();
	});
});
