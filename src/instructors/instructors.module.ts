import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {PrismaModule} from 'src/prisma/prisma.module';
import {InstructorsController} from './instructors.controller';

@Module({
	imports: [
		PrismaModule,
		CacheModule
	],
	controllers: [InstructorsController],
	providers: []
})
export class InstructorsModule {}
