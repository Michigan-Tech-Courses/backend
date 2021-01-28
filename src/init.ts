import {OnModuleInit} from '@nestjs/common';
import {deleteByKey} from './cache/store';

const CACHE_KEYS = ['/courses', '/sections', '/instructors'];

export class InitHandler implements OnModuleInit {
	async onModuleInit() {
		await Promise.all(CACHE_KEYS.map(async k => deleteByKey(k)));
	}
}
