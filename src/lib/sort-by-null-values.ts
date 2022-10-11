const countNullValuesInString = (string: string) => (string.match(/null/g) ?? []).length;

const sortByNullValues = <T extends Record<string, unknown>>(array: T[]) => array.sort((a, b) => countNullValuesInString(JSON.stringify(b)) - countNullValuesInString(JSON.stringify(a)));

export default sortByNullValues;
