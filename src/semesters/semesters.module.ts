import {Module} from '@nestjs/common';
import {SemestersController} from './semesters.controller';
import {PoolModule} from '~/pool/pool.module';

@Module({
	imports: [
		PoolModule
	],
	controllers: [SemestersController],
	providers: []
})
export class SemestersModule {}
