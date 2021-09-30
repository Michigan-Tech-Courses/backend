import {CacheInterceptor, Controller, Get, Header, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import sortSemesters from 'src/lib/sort-semesters';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetCoursesParameters, GetUniqueCoursesParameters, FindFirstCourseParameters} from './types';

@Controller('courses')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
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

	@Get('/unique')
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getUniqueCourses(@Query() parameters?: GetUniqueCoursesParameters) {
		const semesterParameters: Prisma.CourseFindManyArgs['where'] = {};

		if (parameters?.startYear) {
			semesterParameters.year = {
				gte: parameters.startYear
			};
		}

		if (parameters?.semester) {
			semesterParameters.semester = parameters.semester;
		}

		const semesters = await this.prisma.course.findMany({
			distinct: ['semester', 'year'],
			where: semesterParameters,
			select: {
				semester: true,
				year: true
			}
		});

		const semestersToFilterBy = sortSemesters(semesters).reverse().slice(0, 3);

		const queryParameters: Prisma.CourseFindManyArgs & {where: Prisma.CourseWhereInput} = {
			distinct: ['crse', 'subject'],
			where: {
				OR: semestersToFilterBy
			},
			orderBy: {
				id: 'asc'
			}
		};

		if (parameters?.updatedSince) {
			queryParameters.where.OR = semestersToFilterBy.map(s => ({
				...s,
				OR: [
					{
						updatedAt: {
							gt: parameters.updatedSince
						},
						deletedAt: {
							gt: parameters.updatedSince
						}
					}
				]
			}));
		}

		return this.prisma.course.findMany(queryParameters);
	}

	@Get('/first')
	async findFirst(@Query() parameters?: FindFirstCourseParameters) {
		const queryParameters: Prisma.CourseFindManyArgs & {where: Prisma.CourseWhereInput} = {
			where: {},
			include: {
				sections: {
					include: {
						instructors: true
					}
				}
			}
		};

		if (parameters?.crse) {
			queryParameters.where.crse = parameters.crse;
		}

		if (parameters?.subject) {
			queryParameters.where.subject = parameters.subject;
		}

		if (parameters?.year) {
			queryParameters.where.year = parameters.year;
		}

		if (parameters?.semester) {
			queryParameters.where.semester = parameters.semester;
		}

		return this.prisma.course.findFirst(queryParameters);
	}
}
