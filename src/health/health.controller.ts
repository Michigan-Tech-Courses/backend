import {Controller, Get, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('health')
@Injectable()
export class HealthController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getHealth() {
		const [databaseIsReachable] = await Promise.all([
			this.canConnectToDatabase(),
		]);

		return {
			databaseIsReachable,
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
}
