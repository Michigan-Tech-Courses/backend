import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {StatsController} from './stats.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
		CacheModule
	],
	controllers: [StatsController],
	providers: []
})
export class StatsModule {}
