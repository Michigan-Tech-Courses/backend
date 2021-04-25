import {IsDate, IsIn, IsNumber, IsOptional} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';
import {Semester} from '@prisma/client';

export class GetSectionsParameters {
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	@ApiProperty({required: false, description: 'ISO DateTime string; only return instances that have been updated since this date.'})
	updatedSince!: Date;

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	@ApiProperty({required: false, description: 'filter sections by year'})
	year!: number;

	@IsIn(Object.values(Semester))
	@IsOptional()
	@ApiProperty({required: false, description: 'filter sections by semester'})
	semester!: Semester;
}

export class FindFirstSectionParamters {
	@IsOptional()
	@ApiProperty({required: false, description: 'filter sections by CRN (combine with year and semester)'})
	crn!: string;

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	@ApiProperty({required: false, description: 'filter sections by year'})
	year!: number;

	@IsIn(Object.values(Semester))
	@IsOptional()
	@ApiProperty({required: false, description: 'filter sections by semester'})
	semester!: Semester;
}
