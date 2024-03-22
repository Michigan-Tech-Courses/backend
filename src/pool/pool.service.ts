import {Pool} from 'pg';

export class PoolService extends Pool {
	constructor() {
		// Todo: pull from config
		super({
			connectionString: process.env.DATABASE_URL,
			max: 4
		});
	}
}
