import * as db from 'zapatos/db';
import type * as schema from 'zapatos/schema';
import sortSemesters from 'src/lib/sort-semesters';
import type {Pool} from 'pg';
import type {FindFirstCourseParameters, GetCoursesParameters, GetUniqueCoursesParameters} from './types';

export class CoursesService {
	getAllCoursesQuery(parameters?: GetCoursesParameters) {
		const where: schema.WhereableForTable<'Course'> = {};

		if (parameters?.semester) {
			where.semester = parameters.semester;
		}

		if (parameters?.year) {
			where.year = parameters.year;
		}

		if (parameters?.updatedSince) {
			// We don't actually filter on the id column
			where.id = db.conditions.or(db.sql`${'updatedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')}`, db.sql`${'deletedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')}`);
		}

		return db.sql`SELECT *, to_json("offered") as offered FROM ${'Course'} WHERE ${where}`.compile();
	}

	async getUniqueCoursesQuery(pool: Pool, parameters?: GetUniqueCoursesParameters) {
		const whereTerms: schema.WhereableForTable<'Course'> = {};

		if (parameters?.semester) {
			whereTerms.semester = parameters.semester;
		}

		if (parameters?.startYear) {
			whereTerms.year = db.conditions.gte(parameters.startYear);
		}

		const terms = await db.select('Course', whereTerms, {
			columns: ['semester', 'year'],
			distinct: ['semester', 'year'],
		}).run(pool);

		const semestersToFilterBy = sortSemesters(terms).reverse().slice(0, 3);

		let where: db.SQLFragment<any> = db.conditions.or(...semestersToFilterBy);
		if (parameters?.updatedSince) {
			where = db.conditions.or(
				...terms.map(term => db.conditions.and(
					db.conditions.or(
						db.sql`${'updatedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')}`,
						db.sql`${'deletedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')}`
					),
					db.sql`${term}`
				)));
		}

		return db.sql`SELECT DISTINCT ON (subject, crse) *, to_json("offered") as offered FROM ${'Course'} WHERE ${where} ORDER BY ${'subject'} ASC, ${'crse'} ASC, ${'year'} DESC, ${'semester'} DESC`.compile();
	}

	getFirstCourseZapatosQuery(parameters?: FindFirstCourseParameters) {
		const where: schema.WhereableForTable<'Course'> = {};

		if (parameters?.semester) {
			where.semester = parameters.semester;
		}

		if (parameters?.year) {
			where.year = parameters.year;
		}

		if (parameters?.crse) {
			where.crse = parameters.crse;
		}

		if (parameters?.subject) {
			where.subject = parameters.subject;
		}

		return db.selectOne('Course', where, {
			extras: {
				offered: db.sql`to_json("offered")`,
			}
		});
	}
}
