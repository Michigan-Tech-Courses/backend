import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {PrismaModule} from 'src/prisma/prisma.module';
import {SectionsController} from './sections.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PrismaModule,
		PoolModule,
		CacheModule
	],
	controllers: [SectionsController],
	providers: []
})
export class SectionsModule {}
