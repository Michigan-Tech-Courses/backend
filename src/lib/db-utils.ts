import type * as schema from 'zapatos/schema';
import * as db from 'zapatos/db';

export const mapWithSeparator = <TIn, TSeparator, TOut>(
	array: TIn[],
	separator: TSeparator,
	callback: (x: TIn, i: number, a: TIn[]) => TOut
): Array<TOut | TSeparator> => {
	const result: Array<TOut | TSeparator> = [];
	for (let i = 0, length = array.length; i < length; i++) {
		if (i > 0) {
			result.push(separator);
		}

		result.push(callback(array[i], i, array));
	}

	return result;
};

/**
 * Pass the result of this function to the `updateValues` parameter of `db.upsert()` when the `updatedAt` column should change when any of the specified columns change.
 * @param tableName
 * @param columnsToCheck
 * @returns
 */
export const updateUpdatedAtForUpsert = <T extends schema.Table> (tableName: T, columnsToCheck: Array<schema.ColumnForTable<T>>): schema.UpdatableForTable<T> => ({
	updatedAt: db.sql`
			CASE WHEN (
				${mapWithSeparator(columnsToCheck, db.sql`, `, c => db.sql`${tableName}.${c}`)}
			) IS DISTINCT FROM (
				${mapWithSeparator(columnsToCheck, db.sql`, `, c => db.sql`EXCLUDED.${c}`)}
			) THEN now() ELSE ${tableName}.${'updatedAt'} END`,
});

/**
 * Pass the result of this function to the `updateValues` parameter of `db.upsert()` when the `updatedAt` column should change when any of the specified columns change.
 * @param tableName
 * @param columnsToCheck
 * @returns
 */
export const updateDeletedAtUpdatedAtForUpsert = <T extends schema.Table> (tableName: T, columnsToCheck: Array<schema.ColumnForTable<T>>): schema.UpdatableForTable<T> => ({
	deletedAt: db.sql`null`,
	...updateUpdatedAtForUpsert(tableName, columnsToCheck),
});
