import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import type {ICourseOverview, ISection} from '@mtucourses/scraper';
import {Schedule, type IRuleOptions} from 'src/lib/rschedule';
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
		let extensionCourses: ICourseOverview[] = [];
		try {
			extensionCourses = await this.fetcher.getAllSections(term);
		} catch (error: unknown) {
			if (error instanceof Error && error.message === 'Banner services are currently down.') {
				this.logger.warn('Banner services are currently down. Skipping scraping instructors.');
				return;
			}
		}

		const updatedCourses = await db.serializable(this.pool, async trx => {
			// Mark courses in term as deleted by default
			await db.update('Course', {
				deletedAt: new Date(),
			}, {
				semester,
				year
			}).run(trx);

			// Upsert courses
			return db.upsert('Course', extensionCourses.map(extensionCourse => {
				const [minCredits, maxCredits] = this.getCreditsRangeFromCourse(extensionCourse);

				return {
					year,
					semester,
					subject: extensionCourse.subject,
					crse: extensionCourse.crse,
					title: extensionCourse.title,
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
		});

		await db.serializable(this.pool, async trx => {
			// Mark sections in term as deleted by default
			await db.update('Section', {
				deletedAt: new Date(),
			}, {
				courseId: db.sql`${db.self} IN (SELECT ${'id'} FROM ${'Course'} WHERE ${'semester'} = ${db.param(semester)} AND ${'year'} = ${db.param(year)})`
			}).run(trx);

			// Upsert sections
			const sectionsUpsertInput: Array<InsertableForTable<'Section'>> = extensionCourses.flatMap(extensionCourse => extensionCourse.sections.map(extensionSection => {
				const section = this.reshapeSectionFromScraperToDatabase(extensionSection, year);

				const course = updatedCourses.find(course => course.subject === extensionCourse.subject && course.crse === extensionCourse.crse && course.year === year && course.semester === semester);
				if (!course) {
					throw new Error(`Course ${extensionCourse.subject} ${extensionCourse.crse} not found`);
				}

				return {
					...section,
					courseId: course.id
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
