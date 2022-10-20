import {Module} from '@nestjs/common';
import {PoolService} from './pool.service';

@Module({
	imports: [],
	controllers: [],
	providers: [PoolService],
	exports: [PoolService]
})
export class PoolModule {}
