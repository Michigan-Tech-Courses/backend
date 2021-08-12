import {Semester} from '.prisma/client';
import extractBuildingAndRoom, { InstructionTypeE } from './extract-building-and-room';
import sortSemesters from './sort-semesters';

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
    expect(extractBuildingAndRoom('Fisher Hall 0100')).toEqual({
      instructionType: InstructionTypeE.PHYSICAL,
      building: 'Fisher Hall',
      room: '0100'
    })
  })

  it('should extract just the building', () => {
    expect(extractBuildingAndRoom('Fisher Hall')).toEqual({
      instructionType: InstructionTypeE.PHYSICAL,
      building: 'Fisher Hall',
      room: null
    })
  })

  it('should extract just the building (2)', () => {
    expect(extractBuildingAndRoom('ATC')).toEqual({
      instructionType: InstructionTypeE.PHYSICAL,
      building: 'ATC',
      room: null
    })
  })

  it('should extract both from a challenging input', () => {
    expect(extractBuildingAndRoom('1st Center 01B')).toEqual({
      instructionType: InstructionTypeE.PHYSICAL,
      building: '1st Center',
      room: '01B'
    })
  })

  it('should detect online instruction', () => {
    expect(extractBuildingAndRoom('Online Instruction')).toEqual({
      instructionType: InstructionTypeE.ONLINE
    })
  })

  it('should detect remote instruction', () => {
    expect(extractBuildingAndRoom('Remote Instruction')).toEqual({
      instructionType: InstructionTypeE.REMOTE
    })
  })

  it('should detect unknown', () => {
    expect(extractBuildingAndRoom('TBA')).toEqual({
      instructionType: InstructionTypeE.UNKNOWN
    })
  })
})
