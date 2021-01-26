import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: course section details scrape');

	logger.log('Started processing...');

	const prisma = new PrismaClient();
	await prisma.$connect();

	logger.log('Finished processing');

	await prisma.$disconnect();

	cb(null, null);
};

export default processJob;
