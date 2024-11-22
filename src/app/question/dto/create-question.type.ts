import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionTypeDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  guide: string;
  @ApiProperty()
  createdUser: number;
  @ApiProperty()
  parent: number;
}
