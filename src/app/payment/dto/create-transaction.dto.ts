import { ApiProperty } from '@nestjs/swagger';
import { ParentProperty } from 'src/base/base.dto';

export class CreateTransactionDto {
  @ApiProperty()
  price: number;

  @ApiProperty()
  count: number;
  @ApiProperty({ type: ParentProperty })
  payment: {
    id: number;
  };
  @ApiProperty({ type: ParentProperty })
  service: {
    id: number;
  };
}
