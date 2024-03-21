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
		const [canConnectToDatabase, arePendingJobs, haveJobsErrored] = await Promise.all([
			this.canConnectToDatabase(),
			this.arePendingJobs(),
			this.haveJobsErrored()
		].map(async p => pTimeout(p, 2000).catch(() => -1)));

		return {
			canConnectToDatabase,
			arePendingJobs,
			haveJobsErrored,
		};
	}

	private async canConnectToDatabase() {
		try {
			await this.pool.query('SELECT 1');
			return true;
		} catch {
			return false;
		}
	}

	private async arePendingJobs() {
		try {
			const pending_jobs = await db.count('graphile_worker.jobs', {
				locked_at: db.conditions.isNull,
				run_at: db.conditions.lte(db.sql`now()`),
				created_at: db.conditions.lte(db.sql`now() - interval '1 minute'`),
				attempts: 0
			}).run(this.pool);

			return pending_jobs > 0;
		} catch {
			return false;
		}
	}

	private async haveJobsErrored() {
		try {
			const errored_jobs = await db.count('graphile_worker.jobs', {
				last_error: db.conditions.isNotNull,
				created_at: db.conditions.gte(db.sql`now() - interval '1 day'`),
			}).run(this.pool);

			return errored_jobs > 0;
		} catch {
			return false;
		}
	}
}
