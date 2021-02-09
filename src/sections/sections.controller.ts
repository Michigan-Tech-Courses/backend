import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Prisma, Section} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetSectionsParameters} from './types';

@Controller('sections')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllSections(@Query() parameters?: GetSectionsParameters) {
		const courseParameters: Prisma.CourseFindManyArgs & {where: Prisma.CourseWhereInput} = {
			where: {},
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
		};

		if (parameters?.semester) {
			courseParameters.where.semester = parameters.semester;
		}

		if (parameters?.year) {
			courseParameters.where.year = parameters.year;
		}

		if (parameters?.updatedSince) {
			courseParameters.where.sections = {
				every: {
					OR: [
						{
							updatedAt: {
								gt: parameters.updatedSince
							}
						},
						{
							deletedAt: {
								gt: parameters.updatedSince
							}
						}
					]
				}
			};

			courseParameters.where = {
				OR: [
					{
						...courseParameters.where,
						updatedAt: {
							gt: parameters.updatedSince
						}
					},
					{
						...courseParameters.where,
						deletedAt: {
							gt: parameters.updatedSince
						}
					}
				]
			};
		}

		// C'mon TS
		const filteredCoursesWithSections = await this.prisma.course.findMany(courseParameters) as unknown as Array<{sections: Section[]}>;

		// Hoist
		return filteredCoursesWithSections.map(c => c.sections).flat();
	}
}
