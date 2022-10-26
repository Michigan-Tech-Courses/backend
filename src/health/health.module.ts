import {Module} from '@nestjs/common';
import {HealthController} from './health.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule
	],
	controllers: [HealthController],
	providers: []
})
export class HealthModule {}
