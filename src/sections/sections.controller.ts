import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors, Res} from '@nestjs/common';
import {FastifyReply} from 'fastify';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {GetSectionsParameters, FindFirstSectionParamters} from './types';
import {SectionsService} from './sections.service';
import {PoolService} from '~/pool/pool.service';
import {streamSqlQuery} from '~/lib/stream-sql-query';

@Controller('sections')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly pool: PoolService, private readonly service: SectionsService) {}

	@Get('/first')
	async findFirst(@Query() parameters?: FindFirstSectionParamters) {
		return this.service.getFirstSectionZapatosQuery(parameters).run(this.pool);
	}

	@Get()
	async getSections(@Res() reply: FastifyReply, @Query() parameters?: GetSectionsParameters) {
		reply.raw.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');

		return streamSqlQuery({
			query: this.service.getSectionsQuery(parameters),
			pool: this.pool,
			reply,
		});
	}
}
