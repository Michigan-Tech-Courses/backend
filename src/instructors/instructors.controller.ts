import {Controller, Get, Injectable, Query} from '@nestjs/common';
import {Thumbor} from '@mtucourses/thumbor';
import {PrismaService} from 'src/prisma/prisma.service';
import {GetInstructorsParameters} from './types';

@Controller('instructors')
@Injectable()
export class InstructorsController {
	private readonly thumbor = new Thumbor({
		url: process.env.THUMBOR_URL,
		key: process.env.THUMBOR_SECURITY_KEY
	});

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
