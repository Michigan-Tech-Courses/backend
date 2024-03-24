import {
	Controller, Get, Header, Injectable, Query, UseInterceptors
} from '@nestjs/common';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import * as db from 'zapatos/db';
import type {WhereableForTable} from 'zapatos/schema';
import {GetTransferCoursesParameters} from './types';
import {PoolService} from '~/pool/pool.service';

@Controller('transfer-courses')
@UseInterceptors(NoCacheUpdatedSinceInterceptor)
@Injectable()
export class TransferCoursesController {
	constructor(private readonly pool: PoolService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getAll(@Query() parameters?: GetTransferCoursesParameters) {
		const where: WhereableForTable<'TransferCourse'> = {};

		if (parameters?.updatedSince) {
			where.updatedAt = db.conditions.gte(parameters.updatedSince);
		}

		return db.select('TransferCourse', where).run(this.pool);
	}
}
