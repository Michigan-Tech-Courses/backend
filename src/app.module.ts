import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import {ScrapperModule} from './scrapper/scrapper.module';

@Module({
	imports: [
		BullModule.forRoot({
			redis: process.env.REDIS_URL!
		}),
		ScrapperModule
	],
	controllers: [],
	providers: []
})
export class AppModule {}
