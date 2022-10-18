import test from 'ava';
import {getTestService} from '../fixtures/get-test-service';
import {HealthController} from '~/health/health.controller';

test.serial('healthy', async t => {
	const {service} = await getTestService(HealthController);

	const health = await service.getHealth();

	t.deepEqual(health, {
		databaseIsReachable: true
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
		databaseIsReachable: false
	});
});
