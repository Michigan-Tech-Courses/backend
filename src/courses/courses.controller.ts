import {CacheInterceptor, Controller, Get, Injectable, Query, Res, UseInterceptors} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {FastifyReply} from 'fastify';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {PrismaService} from 'src/prisma/prisma.service';
import {CoursesService} from './courses.service';
import {GetCoursesParameters, GetUniqueCoursesParameters, FindFirstCourseParameters} from './types';
import {streamSqlQuery} from '~/lib/stream-sql-query';
import {PoolService} from '~/pool/pool.service';

@Controller('courses')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly prisma: PrismaService, private readonly pool: PoolService, private readonly service: CoursesService) {}

	@Get()
	async getAllCourses(@Res() reply: FastifyReply, @Query() parameters?: GetCoursesParameters) {
		reply.raw.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');

		return streamSqlQuery({
			query: this.service.getAllCoursesQuery(parameters),
			pool: this.pool,
			reply,
		});
	}

	@Get('/unique')
	async getUniqueCourses(@Res() reply: FastifyReply, @Query() parameters?: GetUniqueCoursesParameters) {
		reply.raw.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');

		return streamSqlQuery({
			query: await this.service.getUniqueCoursesQuery(this.pool, parameters),
			pool: this.pool,
			reply,
		});
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
