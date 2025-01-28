import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { QpayService } from './qpay.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Public()
@ApiTags('qpay')
@Controller('qpay')
export class QpayController {
  constructor(private service: QpayService) {}
  @Post()
  create(@Body() dto: string) {
    return this.service.createPayment(100, '');
  }

  @Get('check/:id')
  @ApiParam({ name: 'id' })
  check(@Param('id') id: string) {
    return this.service.checkPayment(id);
  }
  @Post('callback')
  async handleCallback(@Body() payload: any) {
    // Validate the callback
    console.log('Payment Callback:', payload);

    // Update payment status in your database
  }
}
