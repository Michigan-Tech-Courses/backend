import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import {ScrapperModule} from './scrapper/scrapper.module';

@Module({
	imports: [
		BullModule.forRoot({
			redis: {
				port: Number.parseInt(process.env.REDIS_PORT!, 10),
				host: process.env.REDIS_HOST
			}
		}),
		ScrapperModule
	],
	controllers: [],
	providers: []
})
export class AppModule {}
