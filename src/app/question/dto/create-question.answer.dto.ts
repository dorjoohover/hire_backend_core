import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionAnswerDto {
  @ApiProperty()
  value: string;
  @ApiProperty()
  point?: number;
  @ApiProperty()
  orderNumber: number;
  @ApiProperty()
  file?: string;
  @ApiProperty()
  question: number;
  @ApiProperty()
  correct: boolean;
  @ApiProperty()
  reverse?: boolean;
  @ApiProperty()
  negative?: boolean;
  @ApiProperty()
  id?: number;

  category?: number | string;
}

export class UpdateQuestionAnswersDto {
  @ApiProperty()
  question: number;
  @ApiProperty({ isArray: true })
  answers: CreateQuestionAnswerDto[];
}
