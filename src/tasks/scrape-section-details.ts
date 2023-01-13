import {Injectable, Logger} from '@nestjs/common';
import pThrottle from 'p-throttle';
import * as Sentry from '@sentry/node';
import {dateToTerm, termToDate} from 'src/lib/dates';
import getTermsToProcess from 'src/lib/get-terms-to-process';
import parseLocation from 'src/lib/parse-location';
import {Task, TaskHandler} from 'nestjs-graphile-worker';
import * as db from 'zapatos/db';
import type * as schema from 'zapatos/schema';
import QueryStream from 'pg-query-stream';
import type {ISectionDetails} from '@mtucourses/scraper';
import {FetcherService} from '~/fetcher/fetcher.service';
import {fetcherSemesterToDatabaseSemester} from '~/lib/convert-semester-type';
import {PoolService} from '~/pool/pool.service';
import {mapWithSeparator, updateDeletedAtUpdatedAtForUpsert} from '~/lib/db-utils';
import {batchAsyncIterator} from '~/lib/batch-async-iterator';
import {numericHash} from '~/lib/numeric-hash';

const getWhereForSectionsQuery = (terms: Date[]): schema.WhereableForTable<'Section'> => ({
	courseId: db.sql<schema.SQLForTable<'Course'>>`
		${db.self} IN (
			SELECT id
			FROM ${'Course'}
			WHERE
				(${mapWithSeparator(terms.map(d => dateToTerm(d)), db.sql` OR `, term => db.sql`(year = ${db.param(term.year)} AND semester = ${db.param(term.semester)})`)}) AND
				"deletedAt" IS NULL
		)`,
});

const getSectionsQuery = (terms: Date[]) => db.sql`
SELECT ${'Section'}.*, jsonb_build_object(
	'id', course.${'id'},
	'subject', course.${'subject'},
	'crse', course.${'crse'},
	'year', course.${'year'},
	'semester', course.${'semester'},
	'title', course.${'title'}
) AS course
FROM ${'Section'}
LEFT JOIN LATERAL (
	SELECT *
	FROM ${'Course'}
	WHERE ${'Course'}.${'id'} = ${'Section'}.${'courseId'}
) course ON true
WHERE ${getWhereForSectionsQuery(terms)}
ORDER BY ${'Section'}.${'id'} ASC
`;

type SectionsQueryResult = Array<schema.SelectableForTable<'Section'> & {course: Pick<schema.SelectableForTable<'Course'>, 'id' | 'subject' | 'crse' | 'year' | 'semester' | 'title'>}>;

@Injectable()
@Task('scrape-section-details')
export class ScrapeSectionDetailsTask {
	private readonly logger = new Logger(ScrapeSectionDetailsTask.name);
	private readonly throttledGetSectionDetails = pThrottle({limit: 2, interval: 100})(this.fetcher.getSectionDetails.bind(this.fetcher));

	constructor(private readonly pool: PoolService, private readonly fetcher: FetcherService) {}

	@TaskHandler()
	async handler(payload: {terms?: string[]} = {}) {
		const terms = payload.terms?.map(termString => new Date(termString)) ?? await getTermsToProcess();

		this.logger.log(`Processing ${JSON.stringify(terms)}...`);

		const buildings = await db.select('Building', db.all).run(this.pool);

		const sectionsQuery = getSectionsQuery(terms);

		let totalSectionsNotFound = 0;

		// Query streaming requires a direct client instead of a pool instance
		const poolClient = await this.pool.connect();
		try {
			const sectionsQueryStream: AsyncIterable<SectionsQueryResult[number]> = poolClient.query(new QueryStream(sectionsQuery.compile().text, sectionsQuery.compile().values));
			for await (const sections of batchAsyncIterator(sectionsQueryStream, 256)) {
				const {numNotFound} = await this.processSections(sections, buildings);
				totalSectionsNotFound += numNotFound;
			}
		} finally {
			poolClient.release();
		}

		const percentageNotFound = totalSectionsNotFound / (await db.count('Section', getWhereForSectionsQuery(terms)).run(this.pool));

		if (percentageNotFound > 0.1) {
			// We don't throw here because we don't want to keep retrying the task
			Sentry.captureException(new Error(`More than 10% of sections were not found: ${percentageNotFound}. There's probably an issue with the scraper.`));
		}
	}

	private async processSections(sections: SectionsQueryResult, buildings: Array<schema.JSONSelectableForTable<'Building'>>): Promise<{numNotFound: number}> {
		let numberNotFound = 0;

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
					numberNotFound++;
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
		this.logger.log(`Updating ${scrapedSectionDetails.length} sections...`);

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
			updateValues: updateDeletedAtUpdatedAtForUpsert('Section', [
				'locationType',
				'buildingName',
				'room',
			])
		}).run(this.pool);

		// Update courses
		// (Need to clean duplicates)
		const scrapedSectionByCourseId = new Map<string, {extScrapedDetails: ISectionDetails; course: typeof scrapedSectionDetails[number]['section']['course']}>();
		for (const {section, extScrapedDetails} of scrapedSectionDetails) {
			const courseId = section.course.id;
			if (!scrapedSectionByCourseId.has(courseId)) {
				scrapedSectionByCourseId.set(courseId, {
					extScrapedDetails,
					course: section.course
				});
			}
		}

		await db.upsert('Course', [...scrapedSectionByCourseId.values()].map(({extScrapedDetails, course}) => {
			const scrapedSemestersOffered = extScrapedDetails.semestersOffered.map(semester => fetcherSemesterToDatabaseSemester(semester));

			return {
				...course,
				description: extScrapedDetails.description,
				prereqs: extScrapedDetails.prereqs,
				offered: scrapedSemestersOffered
			};
		}), ['id'], {
			updateValues: updateDeletedAtUpdatedAtForUpsert('Course', [
				'description',
				'prereqs',
				'offered',
			])
		}).run(this.pool);

		return {numNotFound: numberNotFound};
	}

	private async updateAssociatedInstructors(sections: Array<{sectionId: string; instructorNames: string[]}>) {
		if (sections.length === 0) {
			return;
		}

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

		return db.serializable(this.pool, async trx => {
			// We don't want this function to run concurrently and create insert conflicts
			await db.sql`SELECT pg_advisory_xact_lock(${db.param(numericHash('getOrCreateInstructorIdsByNames'))});`.run(trx);

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
		`.run(trx);

			const namesToIdsMap = new Map<string, number>();
			for (const {id, full_name} of namesToIds.filter(n => n.id !== null)) {
				namesToIdsMap.set(full_name, id);
			}

			// (remove duplicate values)
			const namesToCreate = [...new Set(namesToIds.filter(n => n.id === null).map(n => n.full_name))];

			if (namesToCreate.length === 0) {
				return namesToIdsMap;
			}

			this.logger.log(`Creating ${JSON.stringify({namesToCreate})}...`);

			const createdInstructors = await db.insert('Instructor', namesToCreate.map(fullName => ({
				fullName
			})), {
				returning: ['id', 'fullName']
			}).run(trx);

			for (const {id, fullName} of createdInstructors) {
				namesToIdsMap.set(fullName, id);
			}

			return namesToIdsMap;
		});
	}
}
