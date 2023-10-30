import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import type {ICourseOverview, ISection} from '@mtucourses/scraper';
import type {IRuleOptions} from 'src/lib/rschedule';
import {Schedule} from 'src/lib/rschedule';
import {calculateDiffInTime, dateToTerm, mapDayCharToRRScheduleString} from 'src/lib/dates';
import getTermsToProcess from 'src/lib/get-terms-to-process';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import type {InsertableForTable} from 'zapatos/schema';
import {FetcherService} from '~/fetcher/fetcher.service';
import {PoolService} from '~/pool/pool.service';
import {updateDeletedAtUpdatedAtForUpsert} from '~/lib/db-utils';

@Injectable()
@Task('scrape-sections')
export class ScrapeSectionsTask {
	private readonly logger = new Logger(ScrapeSectionsTask.name);

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler(payload: {terms?: string[]} = {}) {
		const terms = payload.terms?.map(termString => new Date(termString)) ?? await getTermsToProcess();

		const processTerm = pThrottle({limit: 3, interval: 100})(this.processTerm.bind(this));

		await Promise.all(terms.map(async term => processTerm(term)));
	}

	private async processTerm(term: Date) {
		const {semester, year} = dateToTerm(term);
		let extCourses: ICourseOverview[] = [];
		try {
			extCourses = await this.fetcher.getAllSections(term);
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'Banner services are currently down.') {
				this.logger.warn('Banner services are currently down. Skipping scraping instructors.');
				return;
			}
		}

		await db.serializable(this.pool, async trx => {
			// Mark courses and sections in term as deleted by default
			await db.update('Course', {
				deletedAt: new Date(),
			}, {
				semester,
				year
			}).run(trx);

			await db.update('Section', {
				deletedAt: new Date(),
			}, {
				courseId: db.sql`${db.self} IN (SELECT ${'id'} FROM ${'Course'} WHERE ${'semester'} = ${db.param(semester)} AND ${'year'} = ${db.param(year)})`
			}).run(trx);

			// Upsert courses
			await db.upsert('Course', extCourses.map(extCourse => {
				const [minCredits, maxCredits] = this.getCreditsRangeFromCourse(extCourse);

				return {
					year,
					semester,
					subject: extCourse.subject,
					crse: extCourse.crse,
					title: extCourse.title,
					minCredits,
					maxCredits,
				};
			}), ['year', 'semester', 'subject', 'crse'], {
				updateValues: updateDeletedAtUpdatedAtForUpsert('Course', [
					'title',
					'minCredits',
					'maxCredits'
				])
			}).run(trx);

			// Upsert sections
			const sectionsUpsertInput: Array<InsertableForTable<'Section'>> = extCourses.flatMap(extCourse => extCourse.sections.map(extSection => {
				const section = this.reshapeSectionFromScraperToDatabase(extSection, year);

				return {
					...section,
					courseId: db.sql`(SELECT ${'id'} FROM ${'Course'} WHERE ${'year'} = ${db.param(year)} AND ${'semester'} = ${db.param(semester)} AND ${'subject'} = ${db.param(extCourse.subject)} AND ${'crse'} = ${db.param(extCourse.crse)})`
				};
			}));

			await db.upsert('Section', sectionsUpsertInput, ['courseId', 'section'], {
				updateValues: updateDeletedAtUpdatedAtForUpsert('Section', [
					'crn',
					'cmp',
					'minCredits',
					'maxCredits',
					'time',
					'totalSeats',
					'takenSeats',
					'availableSeats',
					'fee'
				])
			}).run(trx);
		});
	}

	private getCreditsRangeFromCourse(course: ICourseOverview): [number, number] {
		let min = Number.MAX_SAFE_INTEGER;
		let max = Number.MIN_SAFE_INTEGER;

		for (const section of course.sections) {
			if (section.creditRange.length === 2) {
				const [
					sectionMin,
					sectionMax
				] = section.creditRange;

				if (sectionMin < min) {
					min = sectionMin;
				}

				if (sectionMax > max) {
					max = sectionMax;
				}
			} else {
				const [minAndMax] = section.creditRange;

				if (minAndMax < min) {
					min = minAndMax;
				}

				if (minAndMax > max) {
					max = minAndMax;
				}
			}
		}

		return [
			min === Number.MAX_SAFE_INTEGER ? 0 : min,
			max === Number.MIN_SAFE_INTEGER ? 0 : max
		];
	}

	private reshapeSectionFromScraperToDatabase(section: ISection, year: number) {
		const scheduleRules: IRuleOptions[] = [];

		for (const schedule of section.schedules) {
			if (schedule.timeRange.length === 2 && schedule.dateRange.length === 2 && !['', 'TBA'].includes(schedule.days))	{
				const start = new Date(`${schedule.dateRange[0]}/${year} ${schedule.timeRange[0]}`);
				const end = new Date(`${schedule.dateRange[1]}/${year} ${schedule.timeRange[1]}`);

				scheduleRules.push({
					frequency: 'WEEKLY',
					duration: calculateDiffInTime(schedule.timeRange[0], schedule.timeRange[1]),
					byDayOfWeek: schedule.days.split('').map(d => mapDayCharToRRScheduleString(d)),
					start,
					end
				});
			}
		}

		const schedule = new Schedule({
			rrules: scheduleRules
		});

		return {
			crn: section.crn,
			section: section.section,
			cmp: section.cmp,
			minCredits: Math.min(...section.creditRange),
			maxCredits: Math.max(...section.creditRange),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			time: (schedule as any).toJSON() as string,
			totalSeats: section.seats,
			takenSeats: section.seatsTaken,
			availableSeats: section.seatsAvailable,
			fee: Math.round(section.fee)
		};
	}
}
