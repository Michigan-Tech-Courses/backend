import {Module, CacheModule as Cache} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';

@Module({
	imports: [
		PrismaModule,
		Cache.register()
	],
	controllers: [],
	providers: [],
	exports: [Cache]
})
export class CacheModule {}
