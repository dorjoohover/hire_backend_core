import { ApiProperty } from '@nestjs/swagger';

export class CreateUserServiceDto {
  @ApiProperty()
  price: number;

  @ApiProperty()
  count: number;
  @ApiProperty()
  usedUserCount: number;

  @ApiProperty()
  user: number;

  @ApiProperty()
  assessment: number;
}

export class CreateExamServiceDto {
  @ApiProperty()
  service: number;
  @ApiProperty()
  count: number;
  @ApiProperty()
  startDate?: Date;
  @ApiProperty()
  endDate?: Date;
}
