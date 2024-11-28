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

  category?: number | string;
}
