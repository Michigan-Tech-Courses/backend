import {Module} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScrapeInstructorsTask } from './scrape-instructors';
import { ScrapeRateMyProfessorsTask } from './scrape-ratemyprofessors';
import { ScrapeSectionDetailsTask } from './scrape-section-details';
import { ScrapeSectionsTask } from './scrape-sections';
import { ScrapeTransferCoursesTask } from './scrape-transfer-courses';

@Module({
	imports: [
		PrismaService
	],
	controllers: [],
	providers: [
		ScrapeInstructorsTask,
		ScrapeRateMyProfessorsTask,
		ScrapeSectionDetailsTask,
		ScrapeSectionsTask,
		ScrapeTransferCoursesTask
	],
	exports: []
})
export class ScraperModule {}
