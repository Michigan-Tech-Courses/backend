import {CacheInterceptor, Controller, Get, Injectable, UseInterceptors} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('sections')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllSections() {
		const sections = await this.prisma.section.findMany({
			include: {
				instructors: {
					select: {
						id: true
					}
				}
			}
		});

		return sections;
	}
}
