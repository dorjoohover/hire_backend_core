import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  parent?: number;
}
