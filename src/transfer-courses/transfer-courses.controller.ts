import {Controller, Get, Header, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetTransferCoursesParameters} from './types';

@Controller('transfer-courses')
@UseInterceptors(NoCacheUpdatedSinceInterceptor)
@Injectable()
export class TransferCoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getAll(@Query() parameters?: GetTransferCoursesParameters) {
		if (parameters?.updatedSince) {
			return this.prisma.transferCourse.findMany({
				where: {
					updatedAt: {
						gt: parameters.updatedSince
					}
				}
			});
		}

		return this.prisma.transferCourse.findMany();
	}
}
