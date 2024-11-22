import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateQuestionAnswerDto } from './create-question.answer.dto';
import { CreateQuestionAnswerMatrixDto } from './create-question.answer.matrix.dto';
import { CreateQuestionAnswerCategoryDto } from './create-question.answer.category.dto';
import { CreateQuestionCategoryDto } from './create-question.category.dto';
import { CreateQuestionTypeDto } from './create-question.type';

export class CreateQuestionDto {
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
  file?: string;
  category: number;
  createdUser: number;
}

export class UpdateQuestionAnswerDto extends PartialType(
  CreateQuestionAnswerDto,
) {
  id?: number;
}
export class UpdateQuestionCategoryDto extends PartialType(
  CreateQuestionCategoryDto,
) {
  id?: number;
}
export class UpdateQuestionAnswerCategoryDto extends PartialType(
  CreateQuestionAnswerCategoryDto,
) {
  id?: number;
}
export class UpdateQuestionAnswerMatrixDto extends PartialType(
  CreateQuestionAnswerMatrixDto,
) {
  id?: number;
}
export class UpdateQuestionTypeDto extends PartialType(CreateQuestionTypeDto) {
  id?: number;
}

export class CreateQuestionAllDto {
  question: CreateQuestionDto;
  answers: {
    answer: {
      value: UpdateQuestionAnswerDto;
      matrix: UpdateQuestionAnswerMatrixDto[];
    };
    category: UpdateQuestionAnswerCategoryDto;
  }[];
  category: UpdateQuestionCategoryDto;
  type: UpdateQuestionTypeDto;
}
