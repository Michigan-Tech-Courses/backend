import {Controller, Get, Header, Injectable, Query} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetTransferCoursesParameters} from './types';

@Controller('transfer-courses')
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
