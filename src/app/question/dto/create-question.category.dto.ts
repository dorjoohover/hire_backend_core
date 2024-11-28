import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  duration?: number;
  @ApiProperty()
  totalPoint?: number;
  @ApiProperty()
  questionCount?: number;
  status?: number;
  @ApiProperty()
  orderNumber?: number;

  @ApiProperty()
  assessment: number;
  createdUser?: number;
}
