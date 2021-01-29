import redis from 'redis';
import {promisify} from 'util';

export const deleteByKey = async (pattern: string) => {
	const client = redis.createClient({
		host: process.env.REDIS_HOST,
		port: Number.parseInt(process.env.REDIS_PORT!, 10)
	});

	const keys = promisify(client.keys).bind(client);

	const keysMatchingPattern = await keys(`${pattern}*`);

	await new Promise(resolve => {
		client.del(keysMatchingPattern, resolve);
	});

	client.quit();
};
