const getTermsForYear = (year: number) => {
	const spring = new Date();
	spring.setFullYear(year, 0);

	const summer = new Date();
	summer.setFullYear(year, 4);

	const fall = new Date();
	fall.setFullYear(year, 7);

	return [spring, summer, fall];
};

const getTermsToProcess = () => {
	const now = new Date();
	const year = now.getFullYear();

	const terms = [...getTermsForYear(year - 1), ...getTermsForYear(year), ...getTermsForYear(year + 1)];

	if (process.env.NODE_ENV === 'test') {
		// Simplifies testing
		return [terms[0]];
	}

	const toProcess = [];

	for (let i = 0; i < terms.length; i++) {
		if (now < terms[i]) {
			toProcess.push(terms[i - 2], terms[i - 1], terms[i]);
			break;
		}
	}

	return toProcess;
};

export default getTermsToProcess;
