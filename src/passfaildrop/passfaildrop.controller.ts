import {
	Body, Controller, Get, Injectable, Put, UseInterceptors, Headers, Header, Query
} from '@nestjs/common';
import checkAuthHeader from 'src/lib/check-auth-header';
import * as db from 'zapatos/db';
import type {WhereableForTable} from 'zapatos/schema';
import {CacheInterceptor} from '@nestjs/cache-manager';
import {GetAllParameters, type PutDto} from './types';
import {PoolService} from '~/pool/pool.service';

@Controller('passfaildrop')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class PassFailDropController {
	constructor(private readonly pool: PoolService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120')
	async getAll(@Query() parameters?: GetAllParameters) {
		const where: WhereableForTable<'PassFailDrop'> = {};

		if (parameters?.courseSubject) {
			where.courseSubject = parameters.courseSubject;
		}

		if (parameters?.courseCrse) {
			where.courseCrse = parameters.courseCrse;
		}

		const result = await db.select('PassFailDrop', {}, {
			groupBy: ['courseSubject', 'courseCrse', 'year', 'semester'],
			columns: ['semester', 'year', 'courseCrse', 'courseSubject'],
			extras: {
				key: db.sql`CONCAT(${'courseSubject'}, ${'courseCrse'})`,
				dropped: db.sql<any, number>`AVG(dropped)`,
				failed: db.sql<any, number>`AVG(failed)`,
				total: db.sql<any, number>`AVG(total)`,
			}
		}).run(this.pool);

		// Todo: move this into the query
		// eslint-disable-next-line unicorn/no-array-reduce
		return result.reduce<Record<string, unknown[]>>((accumulator, row) => {
			const key = `${row.courseSubject}${row.courseCrse}`;
			accumulator[key] = [
				...(accumulator[key] ?? []),
				{
					semester: row.semester,
					year: row.year,
					dropped: row.dropped,
					failed: row.failed,
					total: row.total,
				}
			];

			return accumulator;
		}, {});
	}

	@Put('/many')
	async putMany(@Body() putManyDto: PutDto[], @Headers('authorization') authHeader: string) {
		checkAuthHeader(authHeader);

		await db.upsert('PassFailDrop', putManyDto, ['courseSubject', 'courseCrse', 'year', 'semester', 'section']).run(this.pool);
	}
}
