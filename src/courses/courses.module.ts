import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {CoursesController} from './courses.controller';
import {CoursesService} from './courses.service';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule,
		CacheModule
	],
	controllers: [CoursesController],
	providers: [CoursesService]
})
export class CoursesModule {}
