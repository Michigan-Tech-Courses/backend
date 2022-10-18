import {CacheInterceptor, Controller, Get, Header, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Thumbor} from '@mtucourses/thumbor';
import {PrismaService} from 'src/prisma/prisma.service';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import {GetInstructorsParameters} from './types';

@Controller('instructors')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class InstructorsController {
	private readonly thumbor = new Thumbor({
		url: process.env.THUMBOR_URL!,
		key: process.env.THUMBOR_SECURITY_KEY
	});

	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getAllInstructors(@Query() parameters?: GetInstructorsParameters) {
		let queryParameters = {};

		if (parameters?.updatedSince) {
			queryParameters = {
				where: {
					OR: [
						{
							updatedAt: {
								gt: parameters.updatedSince
							}
						},
						{
							deletedAt: {
								gt: parameters.updatedSince
							}
						}
					]
				}
			};
		}

		const instructors = await this.prisma.instructor.findMany(queryParameters);

		return instructors.map(instructor => {
			const {photoURL, ...instructorWithoutPhoto} = instructor;
			return {
				...instructorWithoutPhoto,
				thumbnailURL: instructor.photoURL ? this.thumbor.setPath(instructor.photoURL).smartCrop(true).resize(128, 128).buildURL() : null
			};
		});
	}
}
