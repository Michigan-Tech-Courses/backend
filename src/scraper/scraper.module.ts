import {Module} from '@nestjs/common';
import {BullModule} from '@codetheweb/nestjs-bull';
import {join} from 'path';
import {ScraperService} from './scraper.service';

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'scrape-instructors',
			processors: [join(__dirname, 'processors/scrape-instructors.js')]
		}),
		BullModule.registerQueue({
			name: 'scrape-rmp',
			processors: [join(__dirname, 'processors/scrape-ratemyprofessors.js')]
		}),
		BullModule.registerQueue({
			name: 'scrape-sections',
			processors: [join(__dirname, 'processors/scrape-sections.js')]
		}),
		BullModule.registerQueue({
			name: 'scrape-section-details',
			processors: [join(__dirname, 'processors/scrape-section-details.js')]
		})
	],
	controllers: [],
	providers: [ScraperService],
	exports: []
})
export class ScraperModule {}
