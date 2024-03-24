import {Module, type OnApplicationShutdown} from '@nestjs/common';
import {ModuleRef} from '@nestjs/core';
import {PoolService} from './pool.service';

@Module({
	imports: [],
	controllers: [],
	providers: [PoolService],
	exports: [PoolService]
})
export class PoolModule implements OnApplicationShutdown {
	constructor(private readonly moduleReference: ModuleRef) {
		moduleReference.get(PoolService).on('error', error => {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(1);
		});
	}

	async onApplicationShutdown() {
		const pool = this.moduleReference.get(PoolService);
		await pool.end();
	}
}
