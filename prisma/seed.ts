import type {Building} from '@prisma/client';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

const BUILDINGS: Building[] = [
	{
		name: 'Academic Offices Building',
		shortName: 'Academic Offices',
		lat: 47.120_037_597_824_016,
		lon: -88.550_579_353_981_89
	},
	{
		name: 'Annex Building',
		shortName: 'Annex',
		lat: 47.120_484_913_339_53,
		lon: -88.550_580_411_681_24
	},
	{
		name: 'ATDC',
		shortName: 'ATDC',
		lat: 47.111_592_193_085_75,
		lon: -88.552_360_777_583_23
	},
	{
		name: 'Broomball Courts',
		shortName: 'Broomball Courts',
		lat: 47.117_613_745_401_03,
		lon: -88.543_755_813_835_96
	},
	{
		name: 'Chemical Sciences & Engr Bldg',
		shortName: 'ChemSci',
		lat: 47.119_648,
		lon: -88.548_268
	},
	{
		name: 'Douglass Houghton Hall',
		shortName: 'DHH',
		lat: 47.118_551,
		lon: -88.543_761
	},
	{
		name: 'DOW Envir Sciences & Engr Bldg',
		shortName: 'DOW',
		lat: 47.119_427,
		lon: -88.546_361
	},
	{
		name: 'Electrical Energy Resources',
		shortName: 'EERC',
		lat: 47.119_34,
		lon: -88.547_103
	},
	{
		name: 'Fisher Hall',
		shortName: 'Fisher',
		lat: 47.118_101,
		lon: -88.546_039
	},
	{
		name: 'Gates Tennis Center',
		shortName: 'Gates Tennis',
		lat: 47.110_378_846_998_57,
		lon: -88.546_263_617_472_05
	},
	{
		name: 'Great Lakes Research Center',
		shortName: 'Great Lakes',
		lat: 47.120_652_203_589_8,
		lon: -88.546_584_757_228_8
	},
	{
		name: 'Grover C. Dillman Hall',
		shortName: 'Dillman',
		lat: 47.119_119,
		lon: -88.545_922
	},
	{
		name: 'Harold Meese Center',
		shortName: 'Harold Meese',
		lat: 47.119_499_043_921_83,
		lon: -88.553_837_131_812_06
	},
	{
		name: 'Kanwal and Ann Rekhi Hall',
		shortName: 'Rekhi',
		lat: 47.118_352,
		lon: -88.546_984
	},
	{
		name: 'Minerals & Materials Engr Bldg',
		shortName: 'M&M',
		lat: 47.118_958,
		lon: -88.544_968
	},
	{
		name: 'Mont Ripley Ski Hill',
		shortName: 'Ripley',
		lat: 47.127_569_195_418_95,
		lon: -88.560_979_461_400_15
	},
	{
		name: 'R. L. Smith (MEEM) Building',
		shortName: 'MEEM',
		lat: 47.119_506,
		lon: -88.549_203
	},
	{
		name: 'ROTC Building',
		shortName: 'ROTC',
		lat: 47.120_009_637_715_47,
		lon: -88.549_712_997_462_25
	},
	{
		name: 'Rozsa Performing Arts & Educ',
		shortName: 'Rozsa',
		lat: 47.117_545_597_788_37,
		lon: -88.541_929_687_423_83
	},
	{
		name: 'Student Development Complex',
		shortName: 'SDC',
		lat: 47.112_332_382_864_95,
		lon: -88.546_704_824_677_1
	},
	{
		name: 'U.J.Noblet Forestry Building',
		shortName: 'Forestry',
		lat: 47.115_852_201_289_144,
		lon: -88.547_557_395_858_14
	},
	{
		name: 'Van Pelt & Opie Library',
		shortName: 'Library',
		lat: 47.118_698,
		lon: -88.547_921
	},
	{
		name: 'Wadsworth Hall',
		shortName: 'Wads',
		lat: 47.116_858,
		lon: -88.543_84
	},
	{
		name: 'Walker - Arts & Humanities',
		shortName: 'Walker',
		lat: 47.117_628,
		lon: -88.542_724
	}
];

const seed = async () => {
	await Promise.all(BUILDINGS.map(building => prisma.building.upsert({
		create: building,
		update: building,
		where: {
			name: building.name
		}
	})));
};

seed()
	.catch(error => {
		console.error(error);
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
