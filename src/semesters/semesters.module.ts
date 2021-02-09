import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {SemestersController} from './semesters.controller';

@Module({
	imports: [
		PrismaModule
	],
	controllers: [SemestersController],
	providers: []
})
export class SemestersModule {}
