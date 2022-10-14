import fs from 'node:fs/promises';
import glob from 'glob';
import {getTestPostgresDatabaseFactory} from 'ava-postgres';
import {PrismaClient} from '@prisma/client';
import {BUILDINGS} from '../../../prisma/seed';
import {FakeFetcherService} from './fetcher-fake';

export type GetTestDatabaseOptions = {
	seedBuildings?: boolean;
	seedInstructors?: boolean;
	seedCourses?: boolean;
	seedSections?: boolean;
};

export const getTestDatabase = getTestPostgresDatabaseFactory<GetTestDatabaseOptions>({
	async beforeTemplateIsBaked({connection: {pool, connectionString}, params}) {
		const files = glob.sync('prisma/migrations/**/*.sql');

		for (const file of files) {
			await pool.query(await fs.readFile(file, 'utf8'));
		}

		const fakeFetcher = new FakeFetcherService();

		// Force this hook to run in serial since we rely on an environment variable
		await pool.query('SELECT pg_advisory_lock(1);');

		process.env.DATABASE_URL = connectionString;
		const prisma = new PrismaClient();

		if (params.seedBuildings) {
			await prisma.building.createMany({
				data: BUILDINGS
			});
		}

		if (params.seedInstructors) {
			await prisma.instructor.createMany({
				data: fakeFetcher.instructors.map(instructor => ({
					fullName: instructor.name,
				}))
			});
		}

		if (params.seedCourses) {
			await Promise.all(fakeFetcher.courses.map(async course => {
				const createdCourse = await prisma.course.create({
					data: {
						year: course.year,
						semester: course.semester,
						subject: course.extCourse.subject,
						crse: course.extCourse.crse,
						title: course.extCourse.title,
					}
				});

				if (params.seedSections) {
					await prisma.section.createMany({
						data: course.extSections.map(section => ({
							courseId: createdCourse.id,
							crn: section.crn,
							section: section.section,
							cmp: section.cmp,
							minCredits: section.creditRange[0],
							maxCredits: section.creditRange[1],
							time: {},
							totalSeats: section.seats,
							takenSeats: section.seatsTaken,
							availableSeats: section.seatsAvailable,
							fee: section.fee,
						}))
					});
				}
			}));
		}

		await prisma.$disconnect();

		await pool.query(`SELECT pg_advisory_unlock_all()`);
	}
});
