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
  code: string;
  @ApiProperty()
  visible: boolean;
}

export class SendLinkToEmails {
  @ApiProperty({ isArray: true, type: SendLinkToEmail })
  links: SendLinkToEmail[];

  @ApiProperty({ required: false })
  noEmail?: boolean;

  /** Утас руу Skytel WebSMS-ээр давхар илгээх. */
  @ApiProperty({ required: false })
  sms?: boolean;
}

export class RemindDto {
  @ApiProperty({ isArray: true, type: String })
  codes: string[];
  @ApiProperty({ required: false })
  email?: boolean;
  @ApiProperty({ required: false })
  sms?: boolean;
}
