import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors, Header} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetSectionsParameters, FindFirstSectionParamters} from './types';

@Controller('sections')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get('/first')
	async findFirst(@Query() parameters?: FindFirstSectionParamters) {
		const sectionParameters: Prisma.SectionFindFirstArgs & {where: Prisma.SectionWhereInput} = {
			where: {
				course: {}
			},
			include: {
				course: true,
				instructors: true
			}
		};

		if (parameters?.semester) {
			sectionParameters.where.course!.semester = parameters.semester;
		}

		if (parameters?.year) {
			sectionParameters.where.course!.year = parameters.year;
		}

		if (parameters?.crn) {
			sectionParameters.where.crn = parameters.crn;
		}

		return this.prisma.section.findFirst(sectionParameters);
	}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getSections(@Query() parameters?: GetSectionsParameters) {
		const sectionParameters: Prisma.SectionFindManyArgs = {
			where: {
				course: {}
			},
			include: {
				instructors: {
					select: {
						id: true,
					}
				}
			}
		};

		if (parameters?.semester) {
			sectionParameters.where!.course!.semester = parameters.semester;
		}

		if (parameters?.year) {
			sectionParameters.where!.course!.year = parameters.year;
		}

		if (parameters?.updatedSince) {
			sectionParameters.where!.OR = [
				{
					updatedAt: {
						gt: new Date(parameters.updatedSince)
					}
				},
				{
					deletedAt: {
						gt: new Date(parameters.updatedSince)
					}
				}
			];
		}

		return this.prisma.section.findMany(sectionParameters);
	}
}
