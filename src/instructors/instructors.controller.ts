import {Controller, Get, Injectable, Query} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetInstructorsParameters} from './types';

@Controller('instructors')
@Injectable()
export class InstructorsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllInstructors(@Query() parameters?: GetInstructorsParameters) {
		let queryParameters = {};

		if (parameters?.updatedSince) {
			queryParameters = {
				where: {
					updatedAt: {
						gt: parameters.updatedSince
					}
				}
			};
		}

		return this.prisma.instructor.findMany(queryParameters);
	}
}
