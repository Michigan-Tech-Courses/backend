import { termToDate } from "~/lib/dates";
import { FakeFetcherService } from "./fetcher-fake";

export const getFirstTermFromFake = () => {
	const fake = new FakeFetcherService();
	return termToDate({
		year: fake.courses[0].year,
		semester: fake.courses[0].semester
	}).toISOString();
};
