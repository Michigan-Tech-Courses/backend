import {Module} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ScrapeInstructorsTask } from './processors/scrape-instructors';
import { ScrapeRateMyProfessorsTask } from './processors/scrape-ratemyprofessors';
import { ScrapeSectionDetailsTask } from './processors/scrape-section-details';
import { ScrapeSectionsTask } from './processors/scrape-sections';
import { ScrapeTransferCoursesTask } from './processors/scrape-transfer-courses';

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
