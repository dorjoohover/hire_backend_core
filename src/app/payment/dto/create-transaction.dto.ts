import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty()
  price: number;

  @ApiProperty()
  count?: number;
  @ApiProperty()
  payment?: number;

  @ApiProperty()
  service?: number;
  user?: number;
}
