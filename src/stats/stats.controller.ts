import {Controller, Get, Injectable} from '@nestjs/common';
import * as db from 'zapatos/db';
import type {SQLForTable} from 'zapatos/schema';
import {PoolService} from '~/pool/pool.service';

@Controller('stats')
@Injectable()
export class StatsController {
	constructor(private readonly pool: PoolService) {}

	@Get('/jobs')
	async getStats() {
		const query = db.sql<SQLForTable<'JobLog'>>`
    WITH a AS (
      SELECT
        ROW_NUMBER() OVER (PARTITION BY ${'jobName'} ORDER BY ${'createdAt'} DESC) AS rn, ${'graphileJob'}, ${'jobName'}, ${'createdAt'}
      FROM ${'JobLog'}
      ORDER BY ${'createdAt'} DESC
    )
    SELECT ${'jobName'}, ${'createdAt'}, ${'graphileJob'} FROM a
    WHERE rn = 1
`;

		return query.run(this.pool);
	}
}
