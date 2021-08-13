import {Building, LocationType, Section} from '@prisma/client';

const numbersRegex = new RegExp(/(\d)\w+/);

const getMappedBuildingName = (buildingName: string, buildings: Building[]) => {
	const building = buildings.find(b => b.name === buildingName);

	if (!building) {
		console.error(`Missing building: ${buildingName}`);
		return null;
	}

	return building.name;
};

const parseLocation = (from: string, buildings: Building[]): Pick<Section, 'locationType' | 'buildingName' | 'room'> => {
	if (from.toLowerCase().includes('remote')) {
		return {
			locationType: LocationType.REMOTE,
			buildingName: null,
			room: null
		};
	}

	if (from.toLowerCase().includes('online')) {
		return {
			locationType: LocationType.ONLINE,
			buildingName: null,
			room: null
		};
	}

	if (from.toLowerCase().includes('tba')) {
		return {
			locationType: LocationType.UNKNOWN,
			buildingName: null,
			room: null
		};
	}

	const fragments = from.split(' ');

	if (fragments.length === 1) {
		return {
			locationType: LocationType.PHYSICAL,
			buildingName: getMappedBuildingName(from, buildings),
			room: null
		};
	}

	const lastWord = fragments[fragments.length - 1];

	if (numbersRegex.test(lastWord)) {
		return {
			locationType: LocationType.PHYSICAL,
			buildingName: getMappedBuildingName(fragments.splice(0, fragments.length - 1).join(' '), buildings),
			room: lastWord
		};
	}

	return {
		locationType: LocationType.PHYSICAL,
		buildingName: getMappedBuildingName(from, buildings),
		room: null
	};
};

export default parseLocation;
