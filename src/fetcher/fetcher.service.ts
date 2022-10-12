import scraper from '@mtucourses/scraper';
import ratings from '@mtucourses/rate-my-professors';

export abstract class RateMyProfessorsFetcher {
	abstract searchSchool: typeof ratings.searchSchool;
	abstract searchTeacher: typeof ratings.searchTeacher;
	abstract getTeacher: typeof ratings.getTeacher;
}

export abstract class AbstractFetcherService {
	abstract readonly rateMyProfessors: RateMyProfessorsFetcher;
	abstract getAllFaculty(): ReturnType<typeof scraper.getAllFaculty>;
}

export class FetcherService implements AbstractFetcherService {
	readonly rateMyProfessors = ratings;

	async getAllFaculty() {
		return scraper.getAllFaculty();
	}
}
