import {Module} from '@nestjs/common';
import {BuildingsController} from './buildings.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule
	],
	controllers: [BuildingsController],
	providers: []
})
export class BuildingsModule {}
