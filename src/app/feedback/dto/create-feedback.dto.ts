import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus, FeedbackType } from 'src/base/constants';

export class CreateFeedbackDto {
  @ApiProperty({ enum: FeedbackStatus, nullable: true })
  status?: number;
  @ApiProperty({ enum: FeedbackType })
  type: number;
  @ApiProperty({ nullable: true })
  message: string;
  @ApiProperty( )
  assessment: number;
}
