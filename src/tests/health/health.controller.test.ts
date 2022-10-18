import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {HealthController} from '~/health/health.controller';

test.serial('healthy', async t => {
	const {service} = await getTestService(HealthController);

	const health = await service.getHealth();

	t.deepEqual(health, {
		database: 'healthy',
		jobQueue: 'healthy',
		jobs: 'healthy'
	});
});

test.serial('database down', async t => {
	// Still a valid URL from the previous test
	process.env.DATABASE_URL = 'foobar';
	const {service} = await getTestService(HealthController, {
		shouldInjectDatabaseUrl: false
	});

	const health = await service.getHealth();

	t.like(health, {
		database: 'degraded'
	});
});

test.serial('job queue clogged', async t => {
	const {service, prisma} = await getTestService(HealthController);

	// A job that was just created isn't counted...
	await prisma.$queryRaw`INSERT INTO "graphile_worker"."jobs" (task_identifier, payload, created_at) VALUES ('foo', '{}', NOW())`;
	const health = await service.getHealth();
	t.like(health, {
		jobQueue: 'healthy'
	});

	// ...but a job that was created two minutes ago is.
	await prisma.$queryRaw`INSERT INTO "graphile_worker"."jobs" (task_identifier, payload, created_at) VALUES ('foo', '{}', NOW() - INTERVAL '2 minute')`;
	const degradedHealth = await service.getHealth();
	t.like(degradedHealth, {
		jobQueue: 'degraded'
	});
});

test.serial('job queue with errors', async t => {
	const {service, prisma} = await getTestService(HealthController);

	await prisma.$queryRaw`INSERT INTO "graphile_worker"."jobs" (task_identifier, payload, created_at, last_error) VALUES ('foo', '{}', NOW(), 'foo')`;
	const health = await service.getHealth();
	t.like(health, {
		jobs: 'degraded'
	});
});
