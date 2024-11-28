import { ApiProperty } from '@nestjs/swagger';

export class CreateUserAnswerDto {
  @ApiProperty()
  ip: string;
  @ApiProperty()
  device: string;
  @ApiProperty()
  point: number;
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
}
