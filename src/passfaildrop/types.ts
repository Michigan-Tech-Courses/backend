import type {Semester} from '@prisma/client';
import {IsOptional} from 'class-validator';

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

export class GetAllParameters {
	@IsOptional()
		courseSubject!: string;

	@IsOptional()
		courseCrse!: string;
}
