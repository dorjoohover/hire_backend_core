import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateQuestionCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  type: number;
  @ApiProperty()
  status: number;
  @ApiProperty()
  minValue: number;
  @ApiProperty()
  maxValue: number;
  @ApiProperty()
  point: number;
  @ApiProperty()
  orderNumber: number;
  @ApiProperty()
  file: string;

  @ApiProperty()
  assessment: number;
  createdUser: number;
}
