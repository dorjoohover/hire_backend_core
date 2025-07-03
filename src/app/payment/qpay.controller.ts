import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { QpayService } from './qpay.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Public()
@ApiTags('qpay')
@Controller('qpay')
export class QpayController {
  constructor(private service: QpayService) {}
  @Public()
  @Post()
  createInvoice(@Body() amount: number) {
    const res = this.service.createInvoice(10, 89, 5000);
    return res;
  }
  @Public()
  @Get('check/:id')
  @ApiParam({ name: 'id' })
  check(@Param('id') id: string) {
    return this.service.checkPayment(id);
  }
}
