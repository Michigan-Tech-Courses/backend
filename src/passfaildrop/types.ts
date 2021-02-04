import {Semester} from '@prisma/client';

export class PutDto {
	courseSubject!: string;
	courseCrse!: string;
	year!: number;
	semester!: Semester;
	section!: string;
	failed!: number;
	dropped!: number;
	total!: number;
}
