import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {SectionsController} from './sections.controller';
import {SectionsService} from './sections.service';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
		CacheModule
	],
	controllers: [SectionsController],
	providers: [SectionsService]
})
export class SectionsModule {}
