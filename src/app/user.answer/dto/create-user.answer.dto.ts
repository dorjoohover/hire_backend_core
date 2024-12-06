import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerDto {
  @ApiProperty()
  ip: string;
  @ApiProperty()
  device: string;
  @ApiProperty()
  point?: number;
  maxPoint: number;
  minPoint: number;
  @ApiProperty()
  flag: boolean;
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
}

export class CalculateUserAnswerDto {
  question: number;
  matrix: number;
  answerCategory: boolean;
  questionCategory: boolean;
  point: number;
  answer: number;
}
