import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentLevelDto {
  @ApiProperty()
  name: string;
  @ApiProperty()
  description: string;
}
