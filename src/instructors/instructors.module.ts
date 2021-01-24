import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {InstructorsController} from './instructors.controller';

@Module({
	imports: [
		PrismaModule
	],
	controllers: [InstructorsController],
	providers: []
})
export class InstructorsModule {}
