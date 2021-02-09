import {IsDate, IsIn, IsNumber, IsOptional} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {Semester} from '@prisma/client';

export class GetCoursesParameters {
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	@ApiProperty({required: false, description: 'ISO DateTime string; only return instances that have been updated since this date.'})
	updatedSince!: Date;

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	@ApiProperty({required: false, description: 'filter courses by year'})
	year!: number;

	@IsIn(Object.values(Semester))
	@IsOptional()
	@ApiProperty({required: false, description: 'filter courses by semester'})
	semester!: Semester;
}
