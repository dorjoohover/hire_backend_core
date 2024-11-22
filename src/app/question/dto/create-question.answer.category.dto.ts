import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionAnswerCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description?: string;
  @ApiProperty()
  parent: number;
}
