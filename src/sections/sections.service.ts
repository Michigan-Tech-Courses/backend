import * as db from 'zapatos/db';
import type * as schema from 'zapatos/schema';
import type {FindFirstSectionParamters, GetSectionsParameters} from './types';
import {mapWithSeparator} from '~/lib/db-utils';

export class SectionsService {
	getFirstSectionZapatosQuery(parameters?: FindFirstSectionParamters) {
		const where: schema.WhereableForTable<'Section'> = {};

		if (parameters?.crn) {
			where.crn = parameters.crn;
		}

		if (parameters?.semester ?? parameters?.year) {
			where.courseId = db.sql`
      ${db.self} IN (
        SELECT ${'id'}
        FROM ${'Course'}
        WHERE
          ${parameters?.semester ? db.sql`semester = ${db.param(parameters.semester)}` : db.sql``}
          ${parameters?.semester && parameters?.year ? db.sql`AND` : db.sql``}
          ${parameters?.year ? db.sql`year = ${db.param(parameters.year)}` : db.sql``}
      )
    `;
		}

		return db.selectOne('Section', where, {
			lateral: {
				course: db.selectExactlyOne('Course', {id: db.parent('courseId')}),
				instructors: db.select('_InstructorToSection', {
					B: db.parent('id')
				}, {
					lateral: db.selectExactlyOne('Instructor', {id: db.parent('A')})
				})
			}
		});
	}

	getSectionsQuery(parameters?: GetSectionsParameters) {
		const where = [];

		if (parameters?.updatedSince) {
			where.push(db.sql`(${'updatedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')} OR ${'deletedAt'} > ${db.param(parameters.updatedSince, 'timestamptz')})`);
		}

		if (parameters?.semester) {
			where.push(db.sql`(${'courseId'} IN (SELECT ${'id'} FROM ${'Course'} WHERE semester = ${db.param(parameters.semester)}))`);
		}

		if (parameters?.year) {
			where.push(db.sql`(${'courseId'} IN (SELECT ${'id'} FROM ${'Course'} WHERE year = ${db.param(parameters.year)}))`);
		}

		const query = db.sql`
			SELECT ${'Section'}.*, lateral_instructors.result AS instructors
			FROM ${'Section'}
			LEFT JOIN LATERAL (
				SELECT coalesce(jsonb_agg(result), '[]') AS result
				FROM (
					SELECT jsonb_build_object() || jsonb_build_object('id', "A") AS result
					FROM "_InstructorToSection" WHERE ("B" = "Section"."id")
				) AS "sq__InstructorToSection"
			) AS "lateral_instructors"
			ON true
      ${where.length > 0 ? db.sql`WHERE ${mapWithSeparator(where, db.sql` AND `, v => v)}` : db.sql``}
		`;

		return query.compile();
	}
}
