import {Building, PrismaClient} from '@prisma/client';
const prisma = new PrismaClient();

const BUILDINGS: Building[] = [
	{
		name: 'Academic Offices Building',
		shortName: 'Academic Offices',
		lat: 47.120037597824016,
		lon: -88.55057935398189
	},
	{
		name: 'Annex Building',
		shortName: 'Annex',
		lat: 47.12048491333953,
		lon: -88.55058041168124
	},
	{
		name: 'ATDC',
		shortName: 'ATDC',
		lat: 47.11159219308575,
		lon: -88.55236077758323
	},
	{
		name: 'Broomball Courts',
		shortName: 'Broomball Courts',
		lat: 47.11761374540103,
		lon: -88.54375581383596
	},
	{
		name: 'Chemical Sciences & Engr Bldg',
		shortName: 'ChemSci',
		lat: 47.119648,
		lon: -88.548268
	},
	{
		name: 'Douglass Houghton Hall',
		shortName: 'DHH',
		lat: 47.118551,
		lon: -88.543761
	},
	{
		name: 'DOW Envir Sciences & Engr Bldg',
		shortName: 'DOW',
		lat: 47.119427,
		lon: -88.546361
	},
	{
		name: 'Electrical Energy Resources',
		shortName: 'EERC',
		lat: 47.11934,
		lon: -88.547103
	},
	{
		name: 'Fisher Hall',
		shortName: 'Fisher',
		lat: 47.118101,
		lon: -88.546039
	},
	{
		name: 'Gates Tennis Center',
		shortName: 'Gates Tennis',
		lat: 47.11037884699857,
		lon: -88.54626361747205
	},
	{
		name: 'Great Lakes Research Center',
		shortName: 'Great Lakes',
		lat: 47.1206522035898,
		lon: -88.5465847572288
	},
	{
		name: 'Grover C. Dillman Hall',
		shortName: 'Dillman',
		lat: 47.119119,
		lon: -88.545922
	},
	{
		name: 'Harold Meese Center',
		shortName: 'Harold Meese',
		lat: 47.11949904392183,
		lon: -88.55383713181206
	},
	{
		name: 'Kanwal and Ann Rekhi Hall',
		shortName: 'Rekhi',
		lat: 47.118352,
		lon: -88.546984
	},
	{
		name: 'Minerals & Materials Engr Bldg',
		shortName: 'M&M',
		lat: 47.118958,
		lon: -88.544968
	},
	{
		name: 'Mont Ripley Ski Hill',
		shortName: 'Ripley',
		lat: 47.12756919541895,
		lon: -88.56097946140015
	},
	{
		name: 'R. L. Smith (MEEM) Building',
		shortName: 'MEEM',
		lat: 47.119506,
		lon: -88.549203
	},
	{
		name: 'ROTC Building',
		shortName: 'ROTC',
		lat: 47.12000963771547,
		lon: -88.54971299746225
	},
	{
		name: 'Rozsa Performing Arts & Educ',
		shortName: 'Rozsa',
		lat: 47.11754559778837,
		lon: -88.54192968742383
	},
	{
		name: 'Student Development Complex',
		shortName: 'SDC',
		lat: 47.11363882085836,
		lon: -88.54736484245618
	},
	{
		name: 'U.J.Noblet Forestry Building',
		shortName: 'Forestry',
		lat: 47.115852201289144,
		lon: -88.54755739585814
	},
	{
		name: 'Van Pelt & Opie Library',
		shortName: 'Library',
		lat: 47.118698,
		lon: -88.547921
	},
	{
		name: 'Wadsworth Hall',
		shortName: 'Wads',
		lat: 47.116858,
		lon: -88.54384
	},
	{
		name: 'Walker - Arts & Humanities',
		shortName: 'Walker',
		lat: 47.117628,
		lon: -88.542724
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
