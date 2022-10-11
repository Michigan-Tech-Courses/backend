import {Module} from '@nestjs/common';
import {PrismaModule} from 'src/prisma/prisma.module';
import {CacheModule} from 'src/cache/cache.module';
import {CoursesController} from './courses.controller';

@Module({
	imports: [
		PrismaModule,
		CacheModule
	],
	controllers: [CoursesController],
	providers: []
})
export class CoursesModule {}
