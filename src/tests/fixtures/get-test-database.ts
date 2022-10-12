import fs from 'node:fs/promises';
import glob from 'glob';
import {getTestPostgresDatabaseFactory} from 'ava-postgres';

export const getTestDatabase = getTestPostgresDatabaseFactory({
	async beforeTemplateIsBaked({connection: {pool}}) {
		const files = glob.sync('prisma/migrations/**/*.sql');

		for (const file of files) {
			await pool.query(await fs.readFile(file, 'utf8'));
		}
	}
});
