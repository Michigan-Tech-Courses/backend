import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import { GraphileWorkerModule } from 'nestjs-graphile-worker';
import {CacheModule} from 'src/cache/cache.module';
import {ScheduleModule} from '@nestjs/schedule';
import {ScraperModule} from './scraper/scraper.module';
import {InstructorsModule} from './instructors/instructors.module';
import {CoursesModule} from './courses/courses.module';
import {SectionsModule} from './sections/sections.module';
import {PassFailDropModule} from './passfaildrop/passfaildrop.module';
import {SemestersModule} from './semesters/semesters.module';
import {BuildingsModule} from './buildings/buildings.module';
import {TransferCoursesModule} from './transfer-courses/transfer-courses.module';
import {InitHandler} from './init';

@Module({
	imports: [
		CacheModule,
		ConfigModule.forRoot(),
		GraphileWorkerModule.forRoot({
      connectionString: process.env.DATABASE_URL,
			 crontabFile: "./scraper/crontab"
    }),
		ScheduleModule.forRoot(),
		ScraperModule,
		CoursesModule,
		InstructorsModule,
		PassFailDropModule,
		SectionsModule,
		SemestersModule,
		BuildingsModule,
		TransferCoursesModule
	],
	controllers: [],
	providers: [InitHandler]
})
export class AppModule {}
