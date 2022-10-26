import {Controller, Get, Header, Injectable} from '@nestjs/common';
import * as db from 'zapatos/db';
import {PoolService} from '~/pool/pool.service';

@Controller('semesters')
@Injectable()
export class SemestersController {
	constructor(private readonly pool: PoolService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120')
	async getDistinctSemesters() {
		return db.select('Course', db.all, {
			distinct: ['semester', 'year'],
			columns: ['semester', 'year']
		}).run(this.pool);
	}
}
