import { ApiProperty } from '@nestjs/swagger';

class UserAnswer {
  @ApiProperty()
  answer: number;
  @ApiProperty()
  point?: number;
  @ApiProperty()
  matrix?: number;
}
export class CreateUserAnswerDto {
  ip: string;
  device: string;
  maxPoint: number;
  minPoint: number;
  @ApiProperty({ isArray: true, type: UserAnswer })
  answers: UserAnswer[];
  answer?: number;
  point?: number;
  @ApiProperty()
  flag: boolean;
  @ApiProperty()
  code: number;
  @ApiProperty()
  exam: number;
  @ApiProperty()
  question: number;

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
