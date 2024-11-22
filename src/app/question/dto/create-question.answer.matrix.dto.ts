import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateQuestionAnswerMatrixDto {
  @ApiProperty()
  value: string;
  @ApiProperty()
  point: number;
  @ApiProperty()
  orderNumber: number;
  @ApiProperty()
  question: number;

  @ApiProperty()
  category: number;

  @ApiProperty()
  answer: number;
}
