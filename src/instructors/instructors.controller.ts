import {CacheInterceptor, Controller, Get, Header, Injectable, Query, UseInterceptors} from '@nestjs/common';
import {Thumbor} from '@mtucourses/thumbor';
import {NoCacheUpdatedSinceInterceptor} from 'src/interceptors/no-cache-updated-since';
import * as db from 'zapatos/db';
import {GetInstructorsParameters} from './types';
import {PoolService} from '~/pool/pool.service';

@Controller('instructors')
@UseInterceptors(CacheInterceptor, NoCacheUpdatedSinceInterceptor)
@Injectable()
export class InstructorsController {
	private readonly thumbor = new Thumbor({
		url: process.env.THUMBOR_URL!,
		key: process.env.THUMBOR_SECURITY_KEY
	});

	constructor(private readonly pool: PoolService) {}

	@Get()
	@Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400')
	async getAllInstructors(@Query() parameters?: GetInstructorsParameters) {
		const instructors = await db.select('Instructor', parameters?.updatedSince ? db.sql`(${'updatedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')} OR ${'deletedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')})` : {}).run(this.pool);

		return instructors.map(instructor => {
			const {photoURL, ...instructorWithoutPhoto} = instructor;
			return {
				...instructorWithoutPhoto,
				thumbnailURL: instructor.photoURL ? this.thumbor.setPath(instructor.photoURL).smartCrop(true).resize(128, 128).buildURL() : null
			};
		});
	}
}
