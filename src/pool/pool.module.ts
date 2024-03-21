import type {OnApplicationShutdown} from '@nestjs/common';
import {Module} from '@nestjs/common';
import {ModuleRef} from '@nestjs/core';
import {PoolService} from './pool.service';

@Module({
	imports: [],
	controllers: [],
	providers: [PoolService],
	exports: [PoolService]
})
export class PoolModule implements OnApplicationShutdown {
	constructor(private readonly moduleRef: ModuleRef) {
		moduleRef.get(PoolService).on('error', error => {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(1);
		});
	}

	async onApplicationShutdown() {
		const pool = this.moduleRef.get(PoolService);
		await pool.end();
	}
}
