import {Controller, Get, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('health')
@Injectable()
export class HealthController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getHealth() {
		const [isDatabaseReachable, arePendingJobs] = await Promise.all([
			this.canConnectToDatabase(),
			this.arePendingJobs()
		]);

		return {
			database: this.boolStatusToStr(isDatabaseReachable),
			jobQueue: this.boolStatusToStr(!arePendingJobs)
		};
	}

	private async canConnectToDatabase() {
		try {
			await this.prisma.$connect();
			return true;
		} catch {
			return false;
		}
	}

	private async arePendingJobs() {
		try {
			const [{pending_jobs}] = await this.prisma.$queryRaw<Array<{pending_jobs: number}>>`
        SELECT COUNT(*) AS pending_jobs
        FROM "graphile_worker"."jobs"
        WHERE
          locked_at IS NULL AND
          run_at <= NOW() AND
          created_at <= NOW() - INTERVAL '1 minute' AND
          attempts = 0
      `;

			return pending_jobs > 0;
		} catch {
			return false;
		}
	}

	private boolStatusToStr(status: boolean) {
		return status ? 'healthy' : 'degraded';
	}
}
