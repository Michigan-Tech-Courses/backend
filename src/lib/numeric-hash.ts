export const numericHash = (string_: string) => {
	let hash = 0;
	if (string_.length === 0) {
		return hash;
	}

	for (let i = 0; i < string_.length; i++) {
		const chr = string_.codePointAt(i);
		// eslint-disable-next-line no-bitwise
		hash = ((hash << 5) - hash) + (chr ?? 0);
		hash = Math.trunc(hash);
	}

	return hash;
};
