import {Module} from '@nestjs/common';
import {TransferCoursesController} from './transfer-courses.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule
	],
	controllers: [TransferCoursesController],
	providers: []
})
export class TransferCoursesModule {}
