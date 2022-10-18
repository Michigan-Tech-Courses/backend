import {Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';
import {GraphileWorkerModule} from 'nestjs-graphile-worker';
import {CacheModule} from 'src/cache/cache.module';
import {TasksModule} from './tasks/tasks.module';
import {HealthModule} from './health/health.module';
import {InstructorsModule} from './instructors/instructors.module';
import {CoursesModule} from './courses/courses.module';
import {SectionsModule} from './sections/sections.module';
import {PassFailDropModule} from './passfaildrop/passfaildrop.module';
import {SemestersModule} from './semesters/semesters.module';
import {BuildingsModule} from './buildings/buildings.module';
import {TransferCoursesModule} from './transfer-courses/transfer-courses.module';
import {crontab} from './tasks/crontab';

@Module({
	imports: [
		CacheModule,
		ConfigModule.forRoot(),
		GraphileWorkerModule.forRootAsync({
			useFactory: () => ({
				connectionString: process.env.DATABASE_URL,
				crontab
			})
		}),
		TasksModule,
		CoursesModule,
		HealthModule,
		InstructorsModule,
		PassFailDropModule,
		SectionsModule,
		SemestersModule,
		BuildingsModule,
		TransferCoursesModule,
	],
	controllers: [],
	providers: []
})
export class AppModule {}
