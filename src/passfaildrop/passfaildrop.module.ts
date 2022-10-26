import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {PassFailDropController} from './passfaildrop.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
		CacheModule
	],
	controllers: [PassFailDropController],
	providers: []
})
export class PassFailDropModule {}
