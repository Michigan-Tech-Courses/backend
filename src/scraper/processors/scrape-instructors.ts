import {Job, DoneCallback} from 'bull';
import {Logger} from '@nestjs/common';
import {PrismaClient} from '@prisma/client';
import {getAllFaculty, IFaculty} from '@mtucourses/scraper';
import pLimit from 'p-limit';
import equal from 'deep-equal';
import {deleteByKey} from 'src/cache/store';

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
				const storedAttributesToCompare: IFaculty = {
					name: existingInstructor.fullName,
					departments: existingInstructor.departments,
					email: existingInstructor.email,
					phone: existingInstructor.phone,
					office: existingInstructor.office,
					websiteURL: existingInstructor.websiteURL,
					interests: existingInstructor.interests,
					occupations: existingInstructor.occupations,
					photoURL: existingInstructor.photoURL
				};

				if (!equal(storedAttributesToCompare, instructor)) {
					shouldUpsert = true;
				}
			} else {
				shouldUpsert = true;
			}

			if (shouldUpsert) {
				const {name, ...preparedInstructor} = instructor;

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

	await Promise.all([prisma.$disconnect(), deleteByKey('/instructors')]);

	cb(null, null);
};

export default processJob;
