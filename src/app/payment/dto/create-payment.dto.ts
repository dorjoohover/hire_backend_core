import { ApiProperty } from '@nestjs/swagger';
import { Entity } from 'typeorm';

export class CreatePaymentDto {
  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  method: number;
  @ApiProperty()
  message: string;

  user: number;
  charger?: number;
}
