import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {getAllFaculty} from '@mtucourses/scrapper';
import pLimit from 'p-limit';
import equal from 'deep-equal';

const processJob = async (_: Job, cb: DoneCallback) => {
	const logger = new Logger('Job: instructor scrape');

	logger.log('Started processing...');

	const prisma = new PrismaClient();
	await prisma.$connect();

	const faculty = await getAllFaculty();

	logger.log('Finished scraping website');

	const limit = pLimit(10);

	await Promise.all(
		faculty.map(async instructor => limit(async () => {
			const existingInstructor = await prisma.instructor.findUnique({where: {fullName: instructor.name}});

			// Need to prevent upserting if nothing has changed since otherwise updatedAt will be changed
			let shouldUpsert = false;

			if (existingInstructor) {
				// eslint-disable-next-line unused-imports/no-unused-vars-ts
				const {id, fullName, lastPhotoHash, updatedAt, deletedAt, ...storedAttributesToCompare} = existingInstructor;
				// eslint-disable-next-line unused-imports/no-unused-vars-ts
				const {photoURL, ...newAttributesToCompare} = instructor;

				if (!equal({name: instructor.name, ...storedAttributesToCompare}, newAttributesToCompare)) {
					shouldUpsert = true;
				}
			} else {
				shouldUpsert = true;
			}

			if (shouldUpsert) {
				// eslint-disable-next-line unused-imports/no-unused-vars-ts
				const {name, photoURL, ...preparedInstructor} = instructor;

				await prisma.instructor.upsert({
					where: {
						fullName: instructor.name
					},
					update: {...preparedInstructor, fullName: instructor.name},
					create: {...preparedInstructor, fullName: instructor.name}
				});
			}
		})
		));

	logger.log('Finished processing');

	await prisma.$disconnect();

	cb(null, null);
};

export default processJob;
