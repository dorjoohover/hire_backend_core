import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerDto {
  ip: string;
  device: string;
  @ApiProperty()
  point?: number;
  maxPoint: number;
  minPoint: number;
  @ApiProperty()
  flag: boolean;
  @ApiProperty()
  code: number;
  @ApiProperty()
  exam: number;
  @ApiProperty()
  question: number;
  @ApiProperty()
  answer: number;
  @ApiProperty()
  matrix: number;
  @ApiProperty()
  answerCategory: number;
  @ApiProperty()
  questionCategory: number;
  @ApiProperty()
  correct: boolean;
}

export class UserAnswerDtoList {
  @ApiProperty({ isArray: true, type: CreateUserAnswerDto })
  data: CreateUserAnswerDto[];
}
export class CalculateUserAnswerDto {
  question: number;
  matrix: number;
  answerCategory: boolean;
  questionCategory: boolean;
  point: number;
  answer: number;
}
