import { ApiProperty } from '@nestjs/swagger';

class UserAnswer {
  @ApiProperty()
  answer: number;
  @ApiProperty()
  point?: number;
  @ApiProperty()
  matrix?: number;
  @ApiProperty()
  value?: string;
}
export class CreateUserAnswerDto {
  ip: string;
  device: string;
  value?: string;
  startDate: Date;
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
  matrix?: number;
  exam?: number;
  @ApiProperty()
  question: number;

  @ApiProperty()
  answerCategory: number;
  @ApiProperty()
  questionCategory: number;
  correct: boolean;
}

export class UserAnswerDtoList {
  @ApiProperty({ isArray: true, type: CreateUserAnswerDto })
  data: CreateUserAnswerDto[];
  @ApiProperty({ type: Date })
  startDate: Date;
}
export class CalculateUserAnswerDto {
  question: number;
  matrix: number;
  answerCategory: boolean;
  questionCategory: boolean;
  point: number;
  answer: number;
}
