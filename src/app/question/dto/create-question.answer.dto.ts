import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateQuestionAnswerDto {
  @ApiProperty()
  value: string;
  @ApiProperty()
  point: number;
  @ApiProperty()
  orderNumber: number;
  @ApiProperty()
  file: string;
  @ApiProperty()
  question: number;

  @ApiProperty()
  category: number;
}
