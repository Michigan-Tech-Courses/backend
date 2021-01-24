import {IsDate, IsOptional} from 'class-validator';
import {Type} from 'class-transformer';

export class GetInstructorsParameters {
	@IsDate()
	@Type(() => Date)
	@IsOptional()
	updatedSince: Date;
}
