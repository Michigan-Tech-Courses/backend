import {OnModuleInit} from '@nestjs/common';
import {deleteByKey} from './cache/store';

const CACHE_KEYS = ['/courses', '/sections', '/instructors', '/passfaildrop'];

export class InitHandler implements OnModuleInit {
	async onModuleInit() {
		// Clear cache upon startup to allow for schema changes
		await Promise.all(CACHE_KEYS.map(async k => deleteByKey(k)));
	}
}
