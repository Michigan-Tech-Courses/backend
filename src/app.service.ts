import {Injectable} from '@nestjs/common';
import type {WorkerEventMap} from 'graphile-worker';
import * as Sentry from '@sentry/node';
import {GraphileWorkerListener, OnWorkerEvent} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import {PoolService} from './pool/pool.service';

// Capture job errors in Sentry
@Injectable()
@GraphileWorkerListener()
export class AppService {
	constructor(private readonly pool: PoolService) {}

	@OnWorkerEvent('job:error')
	onJobError({job, error}: WorkerEventMap['job:error']) {
		Sentry.withScope(scope => {
			scope.setExtra('job', job);
			Sentry.captureException(error);
		});
	}

	@OnWorkerEvent('job:success')
	async onJobSuccess({job}: WorkerEventMap['job:success']) {
		await db.insert('JobLog', {
			jobName: job.task_identifier,
			graphileJob: JSON.stringify(job),
		}).run(this.pool);
	}
}
