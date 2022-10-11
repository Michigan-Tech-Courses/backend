import type {Building} from '@prisma/client';
import {Semester, LocationType} from '@prisma/client';
import parseLocation from './parse-location';
import sortSemesters from './sort-semesters';

const SAMPLE_BUILDING: Building = {
	name: 'Fisher Hall',
	shortName: 'Fisher',
	lat: 0,
	lon: 0
};

describe('sortSemesters', () => {
	it('should sort correctly', () => {
		expect(sortSemesters([
			{year: 2022, semester: Semester.FALL},
			{year: 2021, semester: Semester.FALL},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.SPRING},
			{year: 2020, semester: Semester.FALL}
		])).toEqual([
			{year: 2020, semester: Semester.FALL},
			{year: 2021, semester: Semester.SPRING},
			{year: 2021, semester: Semester.SUMMER},
			{year: 2021, semester: Semester.FALL},
			{year: 2022, semester: Semester.FALL}
		]);
	});
});

describe('extractBuildingAndRoom', () => {
	it('should extract both', () => {
		expect(parseLocation('Fisher Hall 0100', [SAMPLE_BUILDING])).toEqual({
			locationType: LocationType.PHYSICAL,
			buildingName: 'Fisher Hall',
			room: '0100'
		});
	});

	it('should extract just the building', () => {
		expect(parseLocation('Fisher Hall', [SAMPLE_BUILDING])).toEqual({
			locationType: LocationType.PHYSICAL,
			buildingName: 'Fisher Hall',
			room: null
		});
	});

	it('should extract just the building (2)', () => {
		expect(parseLocation('ATC', [{...SAMPLE_BUILDING, name: 'ATC'}])).toEqual({
			locationType: LocationType.PHYSICAL,
			buildingName: 'ATC',
			room: null
		});
	});

	it('should extract both from a challenging input', () => {
		expect(parseLocation('1st Center 01B', [{...SAMPLE_BUILDING, name: '1st Center'}])).toEqual({
			locationType: LocationType.PHYSICAL,
			buildingName: '1st Center',
			room: '01B'
		});
	});

	it('should detect online instruction', () => {
		expect(parseLocation('Online Instruction', [])).toEqual({
			locationType: LocationType.ONLINE,
			buildingName: null,
			room: null
		});
	});

	it('should detect remote instruction', () => {
		expect(parseLocation('Remote Instruction', [])).toEqual({
			locationType: LocationType.REMOTE,
			buildingName: null,
			room: null
		});
	});

	it('should detect unknown', () => {
		expect(parseLocation('TBA', [])).toEqual({
			locationType: LocationType.UNKNOWN,
			buildingName: null,
			room: null
		});
	});
});
