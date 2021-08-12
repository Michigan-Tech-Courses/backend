import {getAllSections} from '@mtucourses/scraper';

const getTermsForYear = (year: number) => {
	const spring = new Date();
	spring.setFullYear(year, 0);

	const summer = new Date();
	summer.setFullYear(year, 4);

	const fall = new Date();
	fall.setFullYear(year, 7);

	return [spring, summer, fall];
};

const getTermsToProcess = async () => {
	const now = new Date();
	const year = now.getFullYear();

	const terms = [...getTermsForYear(year - 1), ...getTermsForYear(year), ...getTermsForYear(year + 1)];

	if (['test', 'dev'].includes(process.env.NODE_ENV ?? '')) {
		// Simplifies testing
		return [terms[0]];
	}

	const toProcess = [];

	let i = 0;
	while (i < terms.length) {
		if (now < terms[i]) {
			toProcess.push(terms[i - 2], terms[i - 1], terms[i]);
			break;
		}

		i++;
	}

	// Adds future term (i.e. current term is spring but fall courses are available)
	try {
		await getAllSections(terms[i + 1]);

		toProcess.push(terms[i + 1]);
	} catch {}

	return toProcess;
};

export default getTermsToProcess;
