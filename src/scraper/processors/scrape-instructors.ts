import {Injectable, Logger} from '@nestjs/common';
import {getAllFaculty, IFaculty} from '@mtucourses/scraper';
import pThrottle from 'p-throttle';
import equal from 'deep-equal';
import { Task, TaskHandler } from 'nestjs-graphile-worker';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@Task('scrape-instructors')
export class ScrapeInstructorsTask {
	private logger = new Logger(ScrapeInstructorsTask.name);

	constructor(private readonly prisma: PrismaService) {}

	@TaskHandler()
	async handler() {
		const faculty = await getAllFaculty();

	this.logger.log('Finished scraping website');

	const processInstructor = pThrottle({
		limit: 5,
		interval: 512
	})(async (instructor: IFaculty) => {
		const existingInstructor = await this.prisma.instructor.findUnique({where: {fullName: instructor.name}});

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

			await this.prisma.instructor.upsert({
				where: {
					fullName: instructor.name
				},
				update: {...preparedInstructor, fullName: instructor.name},
				create: {...preparedInstructor, fullName: instructor.name}
			});
		}
	});

	await Promise.all(faculty.map(async instructor => processInstructor(instructor)));
	}
}
