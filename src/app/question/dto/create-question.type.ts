import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionTypeDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
  createdUser?: number;
}
