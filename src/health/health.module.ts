import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {HealthController} from './health.controller';

@Module({
	imports: [
		PrismaModule
	],
	controllers: [HealthController],
	providers: []
})
export class HealthModule {}
