import {CacheModule, Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {BullModule} from '@nestjs/bull';
import {ScraperModule} from './scraper/scraper.module';
import {InstructorsModule} from './instructors/instructors.module';
import {CoursesModule} from './courses/courses.module';
import {SectionsModule} from './sections/sections.module';
import {PassFailDropModule} from './passfaildrop/passfaildrop.module';
import {SemestersModule} from './semesters/semesters.module';
import {InitHandler} from './init';

@Module({
	imports: [
		CacheModule.register(),
		ConfigModule.forRoot(),
		BullModule.forRoot({
			redis: {
				port: Number.parseInt(process.env.REDIS_PORT!, 10),
				host: process.env.REDIS_HOST
			}
		}),
		ScraperModule,
		CoursesModule,
		InstructorsModule,
		PassFailDropModule,
		SectionsModule,
		SemestersModule
	],
	controllers: [],
	providers: [InitHandler]
})
export class AppModule {}
