import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {getAllFaculty} from '@mtucourses/scrapper';
import * as pLimit from 'p-limit';

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: instructor scrape');

	logger.log('Started processing...');

	const prisma = new PrismaClient();
	await prisma.$connect();

	const faculty = await getAllFaculty();

	logger.log('Finished scraping website');

	const limit = pLimit(10);

	await Promise.all(
		faculty.map(async instructor => limit(() => prisma.instructor.upsert({
			where: {
				fullName: instructor.name
			},
			update: {
				fullName: instructor.name,
				department: instructor.department,
				email: instructor.email,
				phone: instructor.phone,
				office: instructor.office,
				websiteURL: instructor.websiteURL,
				interests: instructor.interests,
				occupations: instructor.occupations
			},
			create: {
				fullName: instructor.name,
				department: instructor.department,
				email: instructor.email,
				phone: instructor.phone,
				office: instructor.office,
				websiteURL: instructor.websiteURL,
				interests: instructor.interests,
				occupations: instructor.occupations
			}
		})))
	);

	logger.log('Finished processing');

	await prisma.$disconnect();

	cb(null, null);
};

export default processJob;
