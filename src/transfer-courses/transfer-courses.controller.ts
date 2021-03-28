import {Controller, Get, Header, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('transfer-courses')
@Injectable()
export class TransferCoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'max-age=60, stale-while-revalidate=86400')
	async getAll() {
		return this.prisma.transferCourse.findMany();
	}
}
