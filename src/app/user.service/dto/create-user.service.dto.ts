import { ApiProperty } from '@nestjs/swagger';

export class CreateUserServiceDto {
  @ApiProperty()
  count: number;
  usedUserCount: number;
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

export class SendLinkToEmail {
  @ApiProperty()
  emails: string[];
  @ApiProperty()
  code: number;
}
