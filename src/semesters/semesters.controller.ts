import {Controller, Get, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('semesters')
@Injectable()
export class SemestersController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getDistinctSemesters() {
		const semesters = await this.prisma.course.findMany({
			distinct: ['semester', 'year'],
			select: {
				semester: true,
				year: true
			}
		});

		return semesters;
	}
}
