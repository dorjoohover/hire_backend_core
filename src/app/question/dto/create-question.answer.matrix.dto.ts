import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionAnswerMatrixDto {
  @ApiProperty()
  value: string;
  @ApiProperty()
  point: number;
  @ApiProperty()
  orderNumber: number;
  @ApiProperty()
  question: number;

  category: number | string;

  @ApiProperty()
  answer: number;
  id?: number
}
