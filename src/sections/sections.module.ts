import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {PrismaModule} from 'src/prisma/prisma.module';
import {SectionsController} from './sections.controller';

@Module({
	imports: [
		PrismaModule,
		CacheModule
	],
	controllers: [SectionsController],
	providers: []
})
export class SectionsModule {}
