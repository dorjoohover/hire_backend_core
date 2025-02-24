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

export class ChargePaymentDto {
  @ApiProperty()
  amount: number;

  // @ApiProperty()
  // method: number;
  @ApiProperty()
  message: string;

  @ApiProperty()
  id: number;
}

export class DateDto {
  @ApiProperty({ type: Date })
  startDate: Date;

  @ApiProperty({ type: Date })
  endDate: Date;
}
