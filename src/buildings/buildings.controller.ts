import {
	Controller, Get, Header, Injectable
} from '@nestjs/common';
import * as db from 'zapatos/db';
import {PoolService} from '~/pool/pool.service';

@Controller('buildings')
@Injectable()
export class BuildingsController {
	constructor(private readonly pool: PoolService) {}

	@Get()
	@Header('Cache-Control', 'public,max-age=120')
	async getAllBuildings() {
		return db.select('Building', db.all).run(this.pool);
	}
}
