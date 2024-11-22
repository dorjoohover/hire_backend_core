import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateExamDetailDto {
  @ApiProperty()
  pageNumber: number;
  @ApiProperty()
  questionCategoryName: string;

  @ApiProperty({ type: ParentProperty })
  exam: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  question: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  questionCategory: {
    id: number;
  };

  @ApiProperty({ type: ParentProperty })
  service: {
    id: number;
  };
}
