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
  type?: number;
  @ApiProperty()
  level?: number;
  status?: number;
  @ApiProperty()
  minValue: number;
  @ApiProperty()
  maxValue: number;
  @ApiProperty()
  point?: number;
  @ApiProperty()
  orderNumber?: number;
  @ApiProperty()
  file?: string;
  category?: number;
  createdUser?: number;
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
class CreateQuestionAllAnswerDto {
  @ApiProperty({ type: UpdateQuestionAnswerDto })
  value: UpdateQuestionAnswerDto;

  @ApiProperty({ type: UpdateQuestionAnswerDto, isArray: true })
  matrix?: UpdateQuestionAnswerMatrixDto[];
}

class CreateQuestionAllAnswersDto {
  @ApiProperty({ type: CreateQuestionAllAnswerDto, isArray: true })
  answer: CreateQuestionAllAnswerDto[];
  @ApiProperty({ type: UpdateQuestionAnswerCategoryDto, isArray: true })
  category: UpdateQuestionAnswerCategoryDto[];
}

export class CreateQuestionAllDto {
  @ApiProperty({ type: CreateQuestionDto })
  question: CreateQuestionDto;
  @ApiProperty({ type: CreateQuestionAllAnswersDto })
  answers: CreateQuestionAllAnswersDto;
  @ApiProperty()
  category: number;
  @ApiProperty()
  type: number;
}

export const ExampleDISCAllDto = {
  category: 0,
  type: 0,
  question: {
    name: 'Q1 Та ажлын байрандаа БАЙНГА гаргадаг зөвхөн нэг зан төлөв, БАРАГ гаргадаггүй зөвхөн нэг зан төлөвийг тус тус сонгоно уу.',
    minValue: -1,
    maxValue: 1,
    orderNumber: 0,
  },
  answers: {
    answer: [
      {
        value: {
          value: 'Байнга',
          point: 1,
          orderNumber: 0,
        },
        matrix: [
          {
            value: 'Урам зоригтой /Enthusiastic/',
            category: 'D',
            orderNumber: 0,
          },
          {
            value: 'Зоримог /Daring/',
            category: 'I',
            orderNumber: 1,
          },
          {
            value: 'Дипломат /Diplomatic/',
            category: 'S',
            orderNumber: 2,
          },
          {
            value: 'Сэтгэл ханамжтай /Satisfied/',
            category: 'C',
            orderNumber: 3,
          },
        ],
      },
      {
        value: {
          value: 'Бараг үгүй',
          point: -1,
          orderNumber: 1,
        },
        matrix: [
          {
            value: 'Урам зоригтой /Enthusiastic/',
            category: 'D',
            orderNumber: 0,
          },
          {
            value: 'Зоримог /Daring/',
            category: 'I',
            orderNumber: 1,
          },
          {
            value: 'Дипломат /Diplomatic/',
            category: 'S',
            orderNumber: 2,
          },
          {
            value: 'Сэтгэл ханамжтай /Satisfied/',
            category: 'C',
            orderNumber: 3,
          },
        ],
      },
    ],
    category: [
      {
        name: 'D',
        description: 'test',
      },
      {
        name: 'I',
        description: 'test',
      },
      {
        name: 'S',
        description: 'test',
      },
      {
        name: 'C',
        description: 'test',
      },
    ],
  },
};
