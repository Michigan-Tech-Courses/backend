import {Module, CacheModule as Cache} from '@nestjs/common';

@Module({
	imports: [
		Cache.register()
	],
	controllers: [],
	providers: [],
	exports: [Cache]
})
export class CacheModule {}
