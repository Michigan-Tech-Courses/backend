declare module 'JSONStream' {
	import type {Writable} from 'node:stream';

	export const stringify: () => Writable;
}
