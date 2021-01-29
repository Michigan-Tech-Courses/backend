import {IsDate, IsOptional} from 'class-validator';
import {Type} from 'class-transformer';
import {ApiProperty} from '@nestjs/swagger';

export class GetSectionsParameters {
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	@ApiProperty({required: false, description: 'ISO DateTime string; only return instances that have been updated since this date.'})
	updatedSince!: Date;
}
