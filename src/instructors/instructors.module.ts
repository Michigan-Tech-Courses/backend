import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {InstructorsController} from './instructors.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
		CacheModule
	],
	controllers: [InstructorsController],
	providers: []
})
export class InstructorsModule {}
