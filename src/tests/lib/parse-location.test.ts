import type {Building} from '@prisma/client';
import {LocationType} from '@prisma/client';
import test from 'ava';
import parseLocation from '~/lib/parse-location';

const SAMPLE_BUILDING: Building = {
	name: 'Fisher Hall',
	shortName: 'Fisher',
	lat: 0,
	lon: 0
};

test('parse both building and room', t => {
	t.deepEqual(
		parseLocation('Fisher Hall 0100', [SAMPLE_BUILDING]),
		{
			locationType: LocationType.PHYSICAL,
			buildingName: 'Fisher Hall',
			room: '0100'
		}
	);
});

test('parse just the building', t => {
	t.deepEqual(
		parseLocation('Fisher Hall', [SAMPLE_BUILDING]),
		{
			locationType: LocationType.PHYSICAL,
			buildingName: 'Fisher Hall',
			room: null
		}
	);
});

test('parse just the building (no spaces)', t => {
	t.deepEqual(
		parseLocation('ATC', [{...SAMPLE_BUILDING, name: 'ATC'}]),
		{
			locationType: LocationType.PHYSICAL,
			buildingName: 'ATC',
			room: null
		}
	);
});

test('parse both from a challenging input', t => {
	t.deepEqual(
		parseLocation('1st Center 01B', [{...SAMPLE_BUILDING, name: '1st Center'}]),
		{
			locationType: LocationType.PHYSICAL,
			buildingName: '1st Center',
			room: '01B'
		}
	);
});

test('parse online instruction', t => {
	t.deepEqual(
		parseLocation('Online Instruction', []),
		{
			locationType: LocationType.ONLINE,
			buildingName: null,
			room: null
		}
	);
});

test('parse remote instruction', t => {
	t.deepEqual(
		parseLocation('Remote Instruction', []),
		{
			locationType: LocationType.REMOTE,
			buildingName: null,
			room: null
		}
	);
});

test('parse unknown', t => {
	t.deepEqual(
		parseLocation('TBA', []),
		{
			locationType: LocationType.UNKNOWN,
			buildingName: null,
			room: null
		}
	);
});
