import {Module} from '@nestjs/common';
import {BullModule} from '@nestjs/bull';
import {join} from 'path';
import {ScrapperService} from './scrapper.service';

@Module({
	imports: [
		BullModule.registerQueue({
			name: 'scrape-instructors',
			processors: [join(__dirname, 'processors/scrape-instructors.js')]
		})
	],
	controllers: [],
	providers: [ScrapperService],
	exports: []
})
export class ScrapperModule {}
