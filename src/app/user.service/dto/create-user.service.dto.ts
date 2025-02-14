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
  email: string;
  @ApiProperty()
  lastname: string;
  @ApiProperty()
  firstname: string;
  @ApiProperty()
  phone: string;
  @ApiProperty()
  code: number;
  @ApiProperty()
  show: boolean;
}

export class SendLinkToEmails {
  @ApiProperty({ isArray: true, type: SendLinkToEmail })
  links: SendLinkToEmail[];
}
