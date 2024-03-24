import {Controller, Get, Injectable, Query, Res, UseInterceptors} from '@nestjs/common';
import {FastifyReply} from 'fastify';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {CoursesService} from './courses.service';
import {GetCoursesParameters, GetUniqueCoursesParameters, FindFirstCourseParameters} from './types';
import {streamSqlQuery} from '~/lib/stream-sql-query';
import {PoolService} from '~/pool/pool.service';
import { CacheKey } from '@nestjs/cache-manager';

@Controller('courses')
@UseInterceptors(NoCacheUpdatedSinceInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly pool: PoolService, private readonly service: CoursesService) {}

	@Get()
	@CacheKey('courses-list')
	async getAllCourses(@Res() reply: FastifyReply, @Query() parameters?: GetCoursesParameters) {
		reply.raw.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
		reply.raw.setHeader('Access-Control-Allow-Origin', '*');

		return streamSqlQuery({
			query: this.service.getAllCoursesQuery(parameters),
			pool: this.pool,
			reply,
		});
	}

	@Get('/unique')
	async getUniqueCourses(@Res() reply: FastifyReply, @Query() parameters?: GetUniqueCoursesParameters) {
		reply.raw.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
		reply.raw.setHeader('Access-Control-Allow-Origin', '*');

		return streamSqlQuery({
			query: await this.service.getUniqueCoursesQuery(this.pool, parameters),
			pool: this.pool,
			reply,
		});
	}

	@Get('/first')
	async findFirst(@Query() parameters?: FindFirstCourseParameters) {
		return this.service.getFirstCourseZapatosQuery(parameters).run(this.pool);
	}
}
