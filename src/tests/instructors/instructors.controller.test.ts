import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {InstructorsController} from '~/instructors/instructors.controller';

test.serial('returns all instructors', async t => {
	const {service} = await getTestService(InstructorsController, {
		seedInstructors: true
	});

	t.is((await service.getAllInstructors()).length, 1);
});

test.serial('returns updated instructors', async t => {
	const {service, prisma} = await getTestService(InstructorsController, {
		seedInstructors: true
	});

	const now = new Date();

	t.is((await service.getAllInstructors({updatedSince: now})).length, 0);

	await prisma.instructor.updateMany({
		data: {
			updatedAt: new Date()
		}
	});

	t.is((await service.getAllInstructors({updatedSince: now})).length, 1);
});

test.serial('returns updated (deleted) instructors', async t => {
	const {service, prisma} = await getTestService(InstructorsController, {
		seedInstructors: true
	});

	const now = new Date();

	t.is((await service.getAllInstructors({updatedSince: now})).length, 0);

	await prisma.instructor.updateMany({
		data: {
			deletedAt: new Date()
		}
	});

	t.is((await service.getAllInstructors({updatedSince: now})).length, 1);
});
