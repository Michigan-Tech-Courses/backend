import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetSectionsParameters} from './types';

@Controller('sections')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	async getAllSections(@Query() parameters?: GetSectionsParameters) {
		const queryParameters: Prisma.SectionFindManyArgs = {
			include: {
				instructors: {
					select: {
						id: true
					}
				}
			}
		};

		if (parameters?.updatedSince) {
			queryParameters.where = {
				updatedAt: {
					gt: parameters.updatedSince
				}
			};
		}

		const sections = await this.prisma.section.findMany(queryParameters);

		return sections;
	}
}
