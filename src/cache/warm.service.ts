import {Injectable} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import got from 'got';
import {PrismaService} from 'src/prisma/prisma.service';

@Injectable()
export class WarmService {
	constructor(private readonly prisma: PrismaService) {}

	@Cron(CronExpression.EVERY_30_SECONDS)
	async warmCache() {
		const semesters = await this.prisma.course.findMany({
			distinct: ['semester', 'year'],
			select: {
				semester: true,
				year: true
			},
			take: 4,
			orderBy: {
				year: 'desc'
			}
		});

		const client = got.extend({prefixUrl: process.env.ENDPOINT!});

		const promises: Array<Promise<any>> = [];

		semesters.forEach(semester => {
			promises.push(client.get('courses', {searchParams: semester}));
			promises.push(client.get('sections', {searchParams: semester}));
		});

		promises.push(client.get('instructors'));
		promises.push(client.get('passfaildrop'));
		promises.push(client.get('semesters'));

		await Promise.all(promises);
	}
}
