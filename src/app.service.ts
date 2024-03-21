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
	private readonly graphile_job_id_to_sentry_transaction = new Map<string, ReturnType<typeof Sentry.startTransaction>>();

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

	@OnWorkerEvent('job:start')
	async onJobStart({job}: WorkerEventMap['job:start']) {
		this.graphile_job_id_to_sentry_transaction.set(job.id, Sentry.startTransaction({
			op: 'job',
			name: job.task_identifier,
		}));
	}

	@OnWorkerEvent('job:complete')
	async onJobComplete({job}: WorkerEventMap['job:complete']) {
		const transaction = this.graphile_job_id_to_sentry_transaction.get(job.id);
		if (transaction) {
			transaction.finish();
			this.graphile_job_id_to_sentry_transaction.delete(job.id);
		}
	}

	@OnWorkerEvent('worker:fatalError')
	onFatalError({error}: WorkerEventMap['worker:fatalError']) {
		Sentry.captureException(error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}

	@OnWorkerEvent('pool:listen:error')
	onPoolListenError({error}: WorkerEventMap['pool:listen:error']) {
		Sentry.captureException(error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}
}
