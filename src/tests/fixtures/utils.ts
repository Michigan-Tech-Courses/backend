import {FakeFetcherService} from './fetcher-fake';
import {termToDate} from '~/lib/dates';

export const getFirstTermFromFake = () => {
	const fake = new FakeFetcherService();
	return termToDate({
		year: fake.courses[0].year,
		semester: fake.courses[0].semester
	}).toISOString();
};
