import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetCoursesParameters} from './types';

@Controller('courses')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllCourses(@Query() parameters?: GetCoursesParameters) {
		let queryParameters: Prisma.CourseFindManyArgs & {where: Prisma.CourseWhereInput} = {
			where: {}
		};

		if (parameters?.semester) {
			queryParameters.where.semester = parameters.semester;
		}

		if (parameters?.year) {
			queryParameters.where.year = parameters.year;
		}

		if (parameters?.updatedSince) {
			queryParameters = {
				where: {
					OR: [
						{
							...queryParameters.where,
							updatedAt: {
								gt: parameters.updatedSince
							}
						},
						{
							...queryParameters.where,
							deletedAt: {
								gt: parameters.updatedSince
							}
						}
					]
				}
			};
		}

		const courses = await this.prisma.course.findMany(queryParameters);

		return courses;
	}
}
