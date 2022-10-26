import {Injectable} from '@nestjs/common';
import type {WorkerEventMap} from 'graphile-worker';
import * as Sentry from '@sentry/node';
import {GraphileWorkerListener, OnWorkerEvent} from 'nestjs-graphile-worker';

// Capture job errors in Sentry
@Injectable()
@GraphileWorkerListener()
export class AppService {
	@OnWorkerEvent('job:error')
	onJobError({job, error}: WorkerEventMap['job:error']) {
		Sentry.captureException(error, {
			contexts: {
				job: job as Record<string, any>
			}
		});
	}
}
