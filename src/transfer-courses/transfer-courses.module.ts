import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {TransferCoursesController} from './transfer-courses.controller';

@Module({
	imports: [
		PrismaModule
	],
	controllers: [TransferCoursesController],
	providers: []
})
export class TransferCoursesModule {}
