import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
  @ApiProperty()
  measure: string;
  @ApiProperty()
  usage: string;
  @ApiProperty()
  duration: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  function?: string;
  @ApiProperty()
  advice?: string;
  @ApiProperty()
  author?: string;
  @ApiProperty()
  questionCount?: number;
  createdUser: number;
  @ApiProperty()
  level: number;
  @ApiProperty()
  category: number;

  @ApiProperty()
  icons?: string;
}
