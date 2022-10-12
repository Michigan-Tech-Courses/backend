import scraper from '@mtucourses/scraper';

export abstract class AbstractFetcherService {
	abstract getAllFaculty(): ReturnType<typeof scraper.getAllFaculty>;
}

export class FetcherService implements AbstractFetcherService {
	async getAllFaculty() {
		return scraper.getAllFaculty();
	}
}
