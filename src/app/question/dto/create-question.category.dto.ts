import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  value?: string;
  @ApiProperty()
  duration?: number;
  @ApiProperty()
  totalPoint?: number;
  @ApiProperty()
  questionCount?: number;
  status?: number;
  @ApiProperty()
  url?: string;
  @ApiProperty()
  orderNumber?: number;

  @ApiProperty()
  assessment: number;
  createdUser?: number;
  @ApiProperty()
  id?: number;
}
