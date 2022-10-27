import type {OnModuleInit, OnModuleDestroy} from '@nestjs/common';
import {Logger} from '@nestjs/common';
import {Pool} from 'pg';

export class PoolService extends Pool
	implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(PoolService.name);
	constructor() {
		// Todo: pull from config
		super({
			connectionString: process.env.DATABASE_URL,
			max: 10
		});
	}

	async onModuleInit() {
		this.logger.log('Connecting to database pool...');
		await this.connect();
		this.logger.log('Connected to database pool.');
	}

	async onModuleDestroy() {
		await this.end();
	}
}
