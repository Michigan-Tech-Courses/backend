import {Semester} from '@prisma/client';

const values = {
	[Semester.SPRING]: 0.1,
	[Semester.SUMMER]: 0.2,
	[Semester.FALL]: 0.3
};

const sortSemesters = (semesters: Array<{semester: Semester; year: number}>) => semesters.sort((b, a) => {
	return (b.year + values[b.semester]) - (a.year + values[a.semester]);
});

export default sortSemesters;
