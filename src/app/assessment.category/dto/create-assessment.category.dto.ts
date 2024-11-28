import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentCategoryDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  parent?: number;
}

export const AssessmentCategoryExampleDto = {
  name: 'assessment category example 1',
  parent: null,
};
export const AssessmentSubCategoryExampleDto = {
  name: 'assessment subcategory example 1',
  parent: 1,
};
