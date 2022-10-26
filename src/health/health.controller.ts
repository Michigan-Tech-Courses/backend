import {Controller, Get, Injectable} from '@nestjs/common';
import pTimeout from 'p-timeout';
import * as db from 'zapatos/db';
import {PoolService} from '~/pool/pool.service';

@Controller('health')
@Injectable()
export class HealthController {
	constructor(private readonly pool: PoolService) {}

	@Get()
	async getHealth() {
		const [isDatabaseReachable, arePendingJobs, haveJobsErrored] = await Promise.all([
			this.canConnectToDatabase(),
			this.arePendingJobs(),
			this.haveJobsErrored()
		]);

		return {
			database: this.boolStatusToStr(isDatabaseReachable),
			jobQueue: this.boolStatusToStr(!arePendingJobs),
			jobs: this.boolStatusToStr(!haveJobsErrored)
		};
	}

	private async canConnectToDatabase() {
		try {
			await pTimeout(this.pool.connect(), 2000);
			return true;
		} catch {
			return false;
		}
	}

	private async arePendingJobs() {
		try {
			return await pTimeout((async () => {
				const pending_jobs = await db.count('graphile_worker.jobs', {
					locked_at: db.conditions.isNull,
					run_at: db.conditions.lte(db.sql`now()`),
					created_at: db.conditions.lte(db.sql`now() - interval '1 minute'`),
					attempts: 0
				}).run(this.pool);

				return pending_jobs > 0;
			})(), 2000);
		} catch {
			return false;
		}
	}

	private async haveJobsErrored() {
		try {
			return await pTimeout((async () => {
				const errored_jobs = await db.count('graphile_worker.jobs', {
					last_error: db.conditions.isNotNull
				}).run(this.pool);

				return errored_jobs > 0;
			})(), 2000);
		} catch {
			return false;
		}
	}

	private boolStatusToStr(status: boolean) {
		return status ? 'healthy' : 'degraded';
	}
}
