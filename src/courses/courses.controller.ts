import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetCoursesParameters} from './types';

@Controller('courses')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllCourses(@Query() parameters?: GetCoursesParameters) {
		let queryParameters = {};

		if (parameters?.updatedSince) {
			queryParameters = {
				where: {
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
		}

		const courses = await this.prisma.course.findMany(queryParameters);

		return courses;
	}
}
