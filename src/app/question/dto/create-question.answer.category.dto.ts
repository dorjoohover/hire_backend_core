import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionAnswerCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  parent: number;
  @ApiProperty()
  assessment?: number;
  id?: number
}
