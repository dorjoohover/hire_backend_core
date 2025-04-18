import { ApiProperty } from '@nestjs/swagger';
import { ContactType, FeedbackStatus, FeedbackType } from 'src/base/constants';

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackStatus, nullable: true })
  status?: number;
  @ApiProperty({ enum: FeedbackType })
  type: number;
  @ApiProperty({ nullable: true })
  message: string;
  @ApiProperty()
  assessment: number;
}

export class ContactDto {
  @ApiProperty({ enum: ContactType })
  type: number;
  @ApiProperty({ nullable: true })
  message: string;
  @ApiProperty()
  phone: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  email: string;
}
