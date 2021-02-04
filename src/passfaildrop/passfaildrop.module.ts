import {Module} from '@nestjs/common';
import {CacheModule} from 'src/cache/cache.module';
import {PrismaModule} from 'src/prisma/prisma.module';
import {PassFailDropController} from './passfaildrop.controller';

@Module({
	imports: [
		PrismaModule,
		CacheModule
	],
	controllers: [PassFailDropController],
	providers: []
})
export class PassFailDropModule {}
