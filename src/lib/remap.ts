// eslint-disable-next-line max-params
const remap = (value: number, low1: number, high1: number, low2: number, high2: number) => low2 + ((high2 - low2) * (value - low1) / (high1 - low1));

export default remap;
