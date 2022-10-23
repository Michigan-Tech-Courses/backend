import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import {dateToTerm, termToDate} from 'src/lib/dates';
import getTermsToProcess from 'src/lib/get-terms-to-process';
import parseLocation from 'src/lib/parse-location';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import type * as schema from 'zapatos/schema';
import QueryStream from 'pg-query-stream';
import {FetcherService} from '~/fetcher/fetcher.service';
import {fetcherSemesterToDatabaseSemester} from '~/lib/convert-semester-type';
import {PoolService} from '~/pool/pool.service';
import {mapWithSeparator} from '~/lib/db-utils';

type UnwrapQueryResult<T> = T extends db.SQLFragment<infer U> ? U : never;

const getSectionsQuery = (terms: Date[]) => db.select('Section', {
	courseId: db.sql<schema.SQLForTable<'Course'>>`
		${db.self} IN (
			SELECT id
			FROM ${'Course'}
			WHERE
				(${mapWithSeparator(terms.map(d => dateToTerm(d)), db.sql` OR `, term => db.sql`(year = ${db.param(term.year)} AND semester = ${db.param(term.semester)})`)}) AND
				"deletedAt" IS NULL
		)`,
}, {
	lateral: {
		course: db.selectExactlyOne('Course', {
			id: db.parent('courseId')
		}, {
			columns: ['id', 'subject', 'crse', 'year', 'semester', 'title'],
		})
	},
	order: {
		by: 'id',
		direction: 'ASC'
	}
});

type SectionsQueryResult = UnwrapQueryResult<ReturnType<typeof getSectionsQuery>>;

@Injectable()
@Task('scrape-section-details')
export class ScrapeSectionDetailsTask {
	private readonly logger = new Logger(ScrapeSectionDetailsTask.name);
	private readonly throttledGetSectionDetails = pThrottle({limit: 2, interval: 100})(this.fetcher.getSectionDetails.bind(this.fetcher));

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler(payload: {terms?: string[]} = {}) {
		const terms = payload.terms?.map(termString => new Date(termString)) ?? await getTermsToProcess();

		const buildings = await db.select('Building', db.all).run(this.pool);

		const sectionsQuery = getSectionsQuery(terms);

		// Query streaming requires a direct client instead of a pool instance
		const poolClient = await this.pool.connect();
		const sectionsQueryStream = poolClient.query(new QueryStream(sectionsQuery.compile().text, sectionsQuery.compile().values));
		for await (const {result: sections} of sectionsQueryStream as AsyncIterable<{result: SectionsQueryResult}>) {
			await this.processSections(sections, buildings);
		}

		poolClient.release();
	}

	private async processSections(sections: SectionsQueryResult, buildings: Array<schema.JSONSelectableForTable<'Building'>>) {
		const scrapedSectionDetailsWithNulls = await Promise.all(sections.map(async section => {
			try {
				const extScrapedDetails = await this.throttledGetSectionDetails({
					subject: section.course.subject,
					crse: section.course.crse,
					crn: section.crn,
					term: termToDate({year: section.course.year, semester: section.course.semester})
				});

				return {
					extScrapedDetails,
					section
				};
			} catch (error: unknown) {
				if ((error as Error).message === 'Course not found') {
					this.logger.log(`Did not find ${section.course.id}: ${JSON.stringify(section.course)}`);
					this.logger.log('It should be cleaned up automatically on the next course scrape.');
					return null;
				}

				throw error;
			}
		}));

		// Filter out null results
		const scrapedSectionDetails = scrapedSectionDetailsWithNulls.filter(d => d !== null) as Array<NonNullable<typeof scrapedSectionDetailsWithNulls[number]>>;

		// Update instructors
		await this.updateAssociatedInstructors(scrapedSectionDetails.map(({section, extScrapedDetails}) => ({
			sectionId: section.id,
			instructorNames: extScrapedDetails.instructors
		})));

		// Update sections
		await db.upsert('Section', scrapedSectionDetails.map(({section, extScrapedDetails}) => {
			const parsedLocation = parseLocation(extScrapedDetails.location, buildings);
			const {course, ...sectionWithoutCourse} = section;
			return {
				...sectionWithoutCourse,
				id: section.id,
				locationType: parsedLocation.locationType,
				buildingName: parsedLocation.buildingName,
				room: parsedLocation.room,
			};
		}), ['id'], {
			updateValues: {
				updatedAt: db.sql`
					CASE WHEN (
						"Section"."locationType",
						"Section"."buildingName",
						"Section"."room"
					) IS DISTINCT FROM (
						EXCLUDED."locationType",
						EXCLUDED."buildingName",
						EXCLUDED."room"
					) THEN now() ELSE "Section"."updatedAt" END`,
			}
		}).run(this.pool);

		// Update courses
		await db.upsert('Course', scrapedSectionDetails.map(({section, extScrapedDetails}) => {
			const scrapedSemestersOffered = extScrapedDetails.semestersOffered.map(semester => fetcherSemesterToDatabaseSemester(semester));
			return {
				...section.course,
				description: extScrapedDetails.description,
				prereqs: extScrapedDetails.prereqs,
				offered: scrapedSemestersOffered
			};
		}), ['id'], {
			updateValues: {
				updatedAt: db.sql`
						CASE WHEN (
							"Course"."description",
							"Course"."prereqs",
							"Course"."offered"
						) IS DISTINCT FROM (
							EXCLUDED."description",
							EXCLUDED."prereqs",
							EXCLUDED."offered"
						) THEN now() ELSE "Course"."updatedAt" END`,
			}
		}).run(this.pool);
	}

	private async updateAssociatedInstructors(sections: Array<{sectionId: string; instructorNames: string[]}>) {
		// Match instructor names to stored instructors
		const instructorNameToIdMap = await this.getOrCreateInstructorIdsByNames(sections.flatMap(s => s.instructorNames));

		// Update section instructors
		await db.serializable(this.pool, async trx => {
			// Disconnect all instructors for sections
			await db.sql`
				DELETE FROM ${'_InstructorToSection'}
				WHERE ${'B'} IN (${db.vals(sections.map(s => s.sectionId))})
			`.run(trx);

			// Connect instructors to sections
			await db.insert('_InstructorToSection', sections.flatMap(s => s.instructorNames.map(instructorName => ({
				A: instructorNameToIdMap.get(instructorName)!,
				B: s.sectionId
			})))).run(trx);
		});
	}

	private async getOrCreateInstructorIdsByNames(instructorNames: string[]): Promise<Map<string, number>> {
		if (instructorNames.length === 0) {
			return new Map();
		}

		const splitNames = instructorNames.map(name => {
			const fragments = name.split(' ');
			return {
				firstName: fragments[0],
				lastName: fragments[fragments.length - 1],
				fullName: name
			};
		});

		const namesToIds = await db.sql<schema.SQLForTable<'Instructor'>, Array<{id: number; full_name: string}>>`
			SELECT i.id, names.full_name FROM
			(
				SELECT
					UNNEST(ARRAY[${db.vals(splitNames.map(n => n.firstName))}]) AS first_name,
					UNNEST(ARRAY[${db.vals(splitNames.map(n => n.lastName))}]) AS last_name,
					UNNEST(ARRAY[${db.vals(splitNames.map(n => n.fullName))}]) AS full_name
			) AS names
			LEFT JOIN ${'Instructor'} AS i
			ON (
				i.${'fullName'} LIKE names.full_name OR
				i.${'fullName'} LIKE CONCAT(names.first_name, ' & ', names.last_name)
			)
		`.run(this.pool);

		const namesToIdsMap = new Map<string, number>();
		for (const {id, full_name} of namesToIds.filter(n => n.id !== null)) {
			namesToIdsMap.set(full_name, id);
		}

		const namesToCreate = namesToIds.filter(n => n.id === null);
		const createdInstructors = await db.insert('Instructor', namesToCreate.map(n => ({
			fullName: n.full_name
		})), {
			returning: ['id', 'fullName']
		}).run(this.pool);

		for (const {id, fullName} of createdInstructors) {
			namesToIdsMap.set(fullName, id);
		}

		return namesToIdsMap;
	}
}
