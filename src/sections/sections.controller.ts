import {CacheInterceptor, Controller, Get, Injectable, Query, UseInterceptors, Header} from '@nestjs/common';
import type {Prisma} from '@prisma/client';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {PrismaService} from 'src/prisma/prisma.service';
import * as db from 'zapatos/db';
import {GetSectionsParameters, FindFirstSectionParamters} from './types';
import {PoolService} from '~/pool/pool.service';
import {mapWithSeparator} from '~/lib/db-utils';

@Controller('sections')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class SectionsController {
	constructor(private readonly prisma: PrismaService, private readonly pool: PoolService) {}

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
		const where = [];

		if (parameters?.updatedSince) {
			where.push(db.sql`(${'updatedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')} OR ${'deletedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')})`);
		}

		if (parameters?.semester) {
			where.push(db.sql`(${'courseId'} IN (SELECT ${'id'} FROM ${'Course'} WHERE semester = ${db.param(parameters.semester)}))`);
		}

		if (parameters?.year) {
			where.push(db.sql`(${'courseId'} IN (SELECT ${'id'} FROM ${'Course'} WHERE year = ${db.param(parameters.year)}))`);
		}

		return db.select('Section', where.length > 0 ? db.sql`${mapWithSeparator(where, db.sql` AND `, v => v)}` : db.all, {
			lateral: {
				instructors: db.select('_InstructorToSection', {
					B: db.parent('id')
				}, {
					columns: [],
					extras: {
						id: 'A'
					}
				})
			}
		}).run(this.pool);
	}
}
