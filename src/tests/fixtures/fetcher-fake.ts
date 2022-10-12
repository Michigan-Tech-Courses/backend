import type {IFaculty} from '@mtucourses/scraper';
import type {AbstractFetcherService} from '~/fetcher/fetcher.service';

const instructor: IFaculty = {
	name: 'Gorkem Asilioglu',
	departments: ['Computer Science'],
	email: 'galolu@mtu.edu',
	phone: '906-487-1643',
	office: 'Rekhi Hall 308',
	websiteURL: 'http://pages.mtu.edu/~galolu',
	interests: [],
	occupations: [],
	photoURL: null
};

export class FakeFetcherService implements AbstractFetcherService {
	instructors = [instructor];

	async getAllFaculty() {
		return this.instructors;
	}
}
