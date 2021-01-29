import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {CoursesController} from './courses.controller';
import {CacheModule} from 'src/cache/cache.module';

@Module({
	imports: [
		PrismaModule,
		CacheModule
	],
	controllers: [CoursesController],
	providers: []
})
export class CoursesModule {}
