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

// export const ExampleDISCAllDto = {
//   category: {
//     name: 'test',
//     assessment: 4,
//   },
//   type: {
//     name: 'matrix',
//     description:
//       'DiSC aсуумж нь\\xa028 асуумжаас бүрдэнэ. \tАсуумж тус бүрд хувь хүний онцлог шинжийг тодруулсан 4 өөр үг буюу зан төлөв өгөгдсөн. \tӨгөгдсөн 4 зан төлөвөөс та ажлын байран дээрээ байнга гаргадаг зөвхөн нэг зан төлөв, бараг гаргадаггүй зөвхөн нэг зан төлөвийг сонгоно. \tАсуумжид хариулахдаа зөвхөн ажлын байранд гаргадаг зан төлөвийг сонгон хариулах ба бусад нөхцөл хамаарахгүй болно.  \\xa0  Доорх дарааллын дагуу асуумжийг бөглөнө.   \tХүснэгт бүрд 4 үгтэй уншиж танилцаад ажлын байрандаа БАЙНГА гаргадаг зөвхөн 1 зан төлөвийг, БАРАГ гаргадаггүй зөвхөн 1 шинжийг тус тус сонгоно. \tБайнга гаргадаг зөвхөн 1 зан төлөвийг сонгож\\xa0БАЙНГА гэсэн мөрийн харгалзах хэсэгт тэмдэглэнэ. \tБараг гаргадаггүй зөвхөн\\xa0 1 зан төлөвийг сонгож\\xa0БАРАГ ҮГҮЙ гэсэн мөрийн харгалзах хэсэгт тэмдэглэнэ.\\xa0\\xa0 \tНэг асуумжид нийтдээ 2 сонголт хийнэ.',
//   },
//   question: {
//     name: 'Q1 Та ажлын байрандаа БАЙНГА гаргадаг зөвхөн нэг зан төлөв, БАРАГ гаргадаггүй зөвхөн нэг зан төлөвийг тус тус сонгоно уу.',
//     minValue: -1,
//     maxValue: 1,
//     orderNumber: 0,
//   },
//   answers: {
//     answer: [
//       {
//         value: {
//           value: 'Байнга',
//           point: 1,
//           orderNumber: 0,
//         },
//         matrix: [
//           {
//             value: 'Урам зоригтой /Enthusiastic/',
//             category: 'D',
//             orderNumber: 0,
//           },
//           {
//             value: 'Зоримог /Daring/',
//             category: 'I',
//             orderNumber: 1,
//           },
//           {
//             value: 'Дипломат /Diplomatic/',
//             category: 'S',
//             orderNumber: 2,
//           },
//           {
//             value: 'Сэтгэл ханамжтай /Satisfied/',
//             category: 'C',
//             orderNumber: 3,
//           },
//         ],
//       },
//       {
//         value: {
//           value: 'Бараг үгүй',
//           point: -1,
//           orderNumber: 1,
//         },
//         matrix: [
//           {
//             value: 'Урам зоригтой /Enthusiastic/',
//             category: 'D',
//             orderNumber: 0,
//           },
//           {
//             value: 'Зоримог /Daring/',
//             category: 'I',
//             orderNumber: 1,
//           },
//           {
//             value: 'Дипломат /Diplomatic/',
//             category: 'S',
//             orderNumber: 2,
//           },
//           {
//             value: 'Сэтгэл ханамжтай /Satisfied/',
//             category: 'C',
//             orderNumber: 3,
//           },
//         ],
//       },
//     ],
//     category: [
//       {
//         name: 'D',
//         description: 'test',
//       },
//       {
//         name: 'I',
//         description: 'test',
//       },
//       {
//         name: 'S',
//         description: 'test',
//       },
//       {
//         name: 'C',
//         description: 'test',
//       },
//     ],
//   },
// };
