import {Module, CacheModule as Cache} from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';
import {PrismaModule} from 'src/prisma/prisma.module';

@Module({
	imports: [
		PrismaModule,
		Cache.register({
			store: redisStore,
			host: process.env.REDIS_HOST,
			port: Number.parseInt(process.env.REDIS_PORT!, 10),
			ttl: 60 * 60 // Default to 1 hour; scraper processes will clear as necessary
		})
	],
	controllers: [],
	providers: [],
	exports: [Cache]
})
export class CacheModule {}
