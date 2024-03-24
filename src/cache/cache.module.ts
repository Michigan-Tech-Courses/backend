import {Module} from '@nestjs/common';
import {CacheModule as Cache} from '@nestjs/cache-manager';

@Module({
	imports: [
		Cache.register()
	],
	controllers: [],
	providers: [],
	exports: [Cache]
})
export class CacheModule {}
