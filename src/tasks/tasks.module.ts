import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {ScrapeInstructorsTask} from './scrape-instructors';
import {ScrapeRateMyProfessorsTask} from './scrape-ratemyprofessors';
import {ScrapeSectionDetailsTask} from './scrape-section-details';
import {ScrapeSectionsTask} from './scrape-sections';
import {ScrapeTransferCoursesTask} from './scrape-transfer-courses';
import {FetcherModule} from '~/fetcher/fetcher.module';

@Module({
	imports: [
		PrismaModule,
		FetcherModule,
	],
	controllers: [],
	providers: [
		ScrapeInstructorsTask,
		ScrapeRateMyProfessorsTask,
		ScrapeSectionDetailsTask,
		ScrapeSectionsTask,
		ScrapeTransferCoursesTask,
	],
	exports: []
})
export class TasksModule {}
