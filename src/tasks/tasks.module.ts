import {Module} from '@nestjs/common';
import {ScrapeInstructorsTask} from './scrape-instructors';
import {ScrapeRateMyProfessorsTask} from './scrape-ratemyprofessors';
import {ScrapeSectionDetailsTask} from './scrape-section-details';
import {ScrapeSectionsTask} from './scrape-sections';
import {ScrapeTransferCoursesTask} from './scrape-transfer-courses';
import {FetcherModule} from '~/fetcher/fetcher.module';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
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
