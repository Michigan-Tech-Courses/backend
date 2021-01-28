import {CacheInterceptor, Controller, Get, Injectable, UseInterceptors} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('courses')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class CoursesController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllCourses() {
		const courses = await this.prisma.course.findMany();

		return courses;
	}
}
