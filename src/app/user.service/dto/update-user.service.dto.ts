import { PartialType } from '@nestjs/mapped-types';
import { CreateUserServiceDto } from './create-user.service.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserServiceDto extends PartialType(CreateUserServiceDto) {}

export class UpdateDateDto {
  @ApiProperty()
  startDate: Date;
  @ApiProperty()
  endDate: Date;
}
