import type {FastifyReply} from 'fastify';
import type {Pool} from 'pg';
import QueryStream from 'pg-query-stream';
import JSONStream from 'JSONStream';

type Options = {
	query: {
		text: string;
		values: any[];
	};
	pool: Pool;
	reply: FastifyReply;
};

export const streamSqlQuery = async ({query, pool, reply}: Options) => {
	await new Promise<void>((resolve, reject) => {
		pool.connect((error, client, done) => {
			if (error) {
				reject(error);
			}

			const stream = client.query(new QueryStream(query.text, query.values));
			stream.on('end', () => {
				done();
				resolve();
			});

			reply.raw.setHeader('Content-Type', 'application/json');
			stream.pipe(JSONStream.stringify()).pipe(reply.raw);
		});
	});
};
