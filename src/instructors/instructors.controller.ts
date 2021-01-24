import {Controller, Get, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('instructors')
@Injectable()
export class InstructorsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllInstructors() {
		const instructors = await this.prisma.instructor.findMany();

		return instructors;
	}
}
