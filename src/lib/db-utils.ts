export const mapWithSeparator = <TIn, TSep, TOut>(
	array: TIn[],
	separator: TSep,
	cb: (x: TIn, i: number, a: TIn[]) => TOut
): Array<TOut | TSep> => {
	const result: Array<TOut | TSep> = [];
	for (let i = 0, length = array.length; i < length; i++) {
		if (i > 0) {
			result.push(separator);
		}

		result.push(cb(array[i], i, array));
	}

	return result;
};
