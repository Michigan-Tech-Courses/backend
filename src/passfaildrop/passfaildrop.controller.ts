import {Body, CacheInterceptor, Controller, Get, Injectable, Put, UseInterceptors, Headers, Header, Query} from '@nestjs/common';
import {Prisma, Semester} from '@prisma/client';
import pThrottle from 'p-throttle';
import {PrismaService} from 'src/prisma/prisma.service';
import checkAuthHeader from 'src/lib/check-auth-header';
import {GetAllParameters, PutDto} from './types';

@Controller('passfaildrop')
@UseInterceptors(CacheInterceptor)
@Injectable()
export class PassFailDropController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'max-age=120')
	async getAll(@Query() parameters?: GetAllParameters) {
		const query: Prisma.PassFailDropGroupByArgs & {orderBy: Prisma.Enumerable<Prisma.PassFailDropOrderByInput> | undefined} = {
			by: ['courseSubject', 'courseCrse', 'year', 'semester'],
			avg: {
				dropped: true,
				failed: true,
				total: true
			},
			orderBy: {
				year: 'asc'
			},
			where: {}
		};

		if (parameters?.courseCrse) {
			query.where!.courseCrse = parameters.courseCrse;
		}

		if (parameters?.courseSubject) {
			query.where!.courseSubject = parameters.courseSubject;
		}

		const rows = await this.prisma.passFailDrop.groupBy(query);

		// Hoist
		const result: Record<string, Array<{year: number; semester: Semester; dropped: number; failed: number; total: number}>> = {};

		for (const row of rows) {
			const key = `${row.courseSubject}${row.courseCrse}`;

			const newElement = {
				year: row.year,
				semester: row.semester,
				dropped: row.avg!.dropped!,
				failed: row.avg!.failed!,
				total: row.avg!.total!
			};

			if (result[key]) {
				result[key] = [...result[key], newElement];
			} else {
				result[key] = [newElement];
			}
		}

		return result;
	}

	@Put('/many')
	async putMany(@Body() putManyDto: PutDto[], @Headers('authorization') authHeader: string) {
		checkAuthHeader(authHeader);

		const throttledUpsert = pThrottle({limit: 10, interval: 100})(this.prisma.passFailDrop.upsert);

		await Promise.all(putManyDto.map(async row => throttledUpsert({
			where: {
				courseSubject_courseCrse_year_semester_section: {
					courseSubject: row.courseSubject,
					courseCrse: row.courseCrse,
					year: row.year,
					semester: row.semester,
					section: row.section
				}
			},
			create: row,
			update: row
		})));
	}
}
