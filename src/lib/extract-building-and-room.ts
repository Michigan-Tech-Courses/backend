const numbersRegex = new RegExp(/(\d)\w+/);

export enum InstructionTypeE {
	PHYSICAL,
	REMOTE,
	ONLINE,
	UNKNOWN
}

type ReturnedBuilding = {
	instructionType: InstructionTypeE.PHYSICAL;
	building: string;
	room: string | null;
} | {
	instructionType: Exclude<InstructionTypeE, InstructionTypeE.PHYSICAL>;
};

const extractBuildingAndRoom = (from: string): ReturnedBuilding => {
	if (from.toLowerCase().includes('remote')) {
		return {
			instructionType: InstructionTypeE.REMOTE
		};
	}

	if (from.toLowerCase().includes('online')) {
		return {
			instructionType: InstructionTypeE.ONLINE
		};
	}

	if (from.toLowerCase().includes('tba')) {
		return {
			instructionType: InstructionTypeE.UNKNOWN
		};
	}

	const fragments = from.split(' ');

	if (fragments.length === 1) {
		return {
			instructionType: InstructionTypeE.PHYSICAL,
			building: from,
			room: null
		};
	}

	const lastWord = fragments[fragments.length - 1];

	if (numbersRegex.test(lastWord)) {
		return {
			instructionType: InstructionTypeE.PHYSICAL,
			building: fragments.splice(0, fragments.length - 1).join(' '),
			room: lastWord
		};
	}

	return {
		instructionType: InstructionTypeE.PHYSICAL,
		building: from,
		room: null
	};
};

export default extractBuildingAndRoom;
