import {PrismaClient} from '@prisma/client';
import {BUILDINGS} from './seed-data';

const prisma = new PrismaClient();

const seed = async () => {
	await Promise.all(BUILDINGS.map(building => prisma.building.upsert({
		create: building,
		update: building,
		where: {
			name: building.name
		}
	})));
};

seed()
	.catch(error => {
		console.error(error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
