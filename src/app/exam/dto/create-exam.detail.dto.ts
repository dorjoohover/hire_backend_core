import { ApiProperty } from '@nestjs/swagger';

export class CreateExamDetailDto {
  @ApiProperty()
  pageNumber: number;
  @ApiProperty()
  questionCategoryName: string;

  @ApiProperty()
  exam: number;
  @ApiProperty()
  question: number;
  @ApiProperty()
  questionCategory: number;

  @ApiProperty()
  service: number;
}
