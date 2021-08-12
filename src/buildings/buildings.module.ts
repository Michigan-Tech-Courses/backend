import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {BuildingsController} from './buildings.controller';

@Module({
	imports: [
		PrismaModule
	],
	controllers: [BuildingsController],
	providers: []
})
export class BuildingsModule {}
