import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {BullModule} from '@nestjs/bull';
import {ScrapperModule} from './scrapper/scrapper.module';
import {InstructorsController} from './instructors/instructors.controller';
import {PrismaModule} from './prisma/prisma.module';

@Module({
	imports: [
		ConfigModule.forRoot(),
		BullModule.forRoot({
			redis: {
				port: Number.parseInt(process.env.REDIS_PORT!, 10),
				host: process.env.REDIS_HOST
			}
		}),
		PrismaModule,
		ScrapperModule
	],
	controllers: [InstructorsController],
	providers: []
})
export class AppModule {}
