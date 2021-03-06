import {Job} from 'bullmq';
import {Logger} from '@nestjs/common';
import {getAllFaculty, IFaculty} from '@mtucourses/scraper';
import pThrottle from 'p-throttle';
import equal from 'deep-equal';
import {deleteByKey} from 'src/cache/store';
import prisma from 'src/lib/prisma-singleton';

const processJob = async (_: Job) => {
	const logger = new Logger('Job: instructor scrape');

	logger.log('Started processing...');

	await prisma.$connect();

	const faculty = await getAllFaculty();

	logger.log('Finished scraping website');

	const processInstructor = pThrottle({
		limit: 5,
		interval: 512
	})(async (instructor: IFaculty) => {
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
	});

	await Promise.all(faculty.map(async instructor => processInstructor(instructor)));

	logger.log('Finished processing');

	await Promise.all([prisma.$disconnect(), deleteByKey('/instructors')]);
};

export default processJob;
