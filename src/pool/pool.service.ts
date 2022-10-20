import type {OnModuleInit, OnModuleDestroy} from '@nestjs/common';
import {Pool} from 'pg';

export class PoolService extends Pool
	implements OnModuleInit, OnModuleDestroy {
	constructor() {
		// Todo: pull from config
		super({
			connectionString: process.env.DATABASE_URL,
		});
	}

	async onModuleInit() {
		await this.connect();
	}

	async onModuleDestroy() {
		await this.end();
	}
}
