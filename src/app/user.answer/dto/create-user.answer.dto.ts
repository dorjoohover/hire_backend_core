import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateUserAnswerDto {
  @ApiProperty()
  ip: string;
  @ApiProperty()
  device: string;
  @ApiProperty()
  point: number;
  @ApiProperty()
  flag: boolean;
  @ApiProperty({ type: ParentProperty })
  exam: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  question: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  answer: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  matrix: {
    id: number;
  };
}
