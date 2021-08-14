import {Controller, Get, Header, Injectable} from '@nestjs/common';
import {PrismaService} from 'src/prisma/prisma.service';

@Controller('buildings')
@Injectable()
export class BuildingsController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@Header('Cache-Control', 'public,max-age=120')
	async getAllBuildings() {
		return this.prisma.building.findMany();
	}
}
