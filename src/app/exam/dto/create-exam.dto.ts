import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { AssessmentEntity } from 'src/app/assessment/entities/assessment.entity';

export class CreateExamDto {
  code?: string;
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
  code: string;
  @ApiProperty()
  category?: number;
  /** Шилжиж буй (одоогийн) бүлэг — client-ийн live шалгалттай хамт. */
  @ApiProperty({ required: false })
  from?: number;
  /** `from` бүлгийн заавал бөглөх асуултууд бүгд бөглөгдсөн эсэх. */
  @ApiProperty({ required: false })
  complete?: boolean;
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
