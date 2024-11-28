import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';

export class CreateExamDto {
  code?: number;
  assessment?: AssessmentEntity;
  @ApiProperty({ type: Date })
  startDate: Date;
  @ApiProperty({ type: Date })
  endDate: Date;
  @ApiProperty()
  @IsNotEmpty()
  service: number;
}
