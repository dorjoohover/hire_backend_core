import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateExamDto {
  @ApiProperty()
  code: number;
  @ApiProperty()
  assessment: string;
  @ApiProperty()
  @ApiProperty({ type: Date })
  startDate: Date;
  @ApiProperty({ type: Date })
  endDate: Date;
  @ApiProperty({ type: Date })
  userEndDate: Date;
  @ApiProperty({ type: Date })
  userStartDate: Date;
  @ApiProperty({ type: ParentProperty })
  service: {
    id: number;
  };
}
