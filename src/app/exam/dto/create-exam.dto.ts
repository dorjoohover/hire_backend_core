import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';

export class CreateExamDto {
  code?: number;
  created?: number;
  assessment?: AssessmentEntity;
  @ApiProperty({ type: Date })
  startDate: Date;
  @ApiProperty({ type: Date })
  endDate: Date;
  @ApiProperty()
  @IsNotEmpty()
  service: number;
}

export class FindExamByCodeDto {
  @ApiProperty()
  code: number;
  @ApiProperty()
  category?: number;
}

export class ExamUser {
  @ApiProperty({ isArray: true })
  id: number[];
}

export class AdminExamDto {
  @ApiProperty()
  assessment: number;
  @ApiProperty()
  email: string;
  @ApiProperty({ type: Date })
  startDate: Date;

  @ApiProperty({ type: Date })
  endDate: Date;
}
