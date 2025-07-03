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
  private readonly logger = new Logger(QpayController.name);
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
  @Public()
  @Get('callback')
  async handleCallback(@Query('qpay_payment_id') id: string): Promise<any> {
    this.logger.log('Received QPay callback:', id);

    // Баталгаажуулах (optional)
    const result = await this.service.getInvoice(id);

    if (result?.paid_amount > 0) {
      // 📌 Энд таны бизнесийн логик: төлбөрийн статус хадгалах, хэрэглэгчт мэдэгдэх гэх мэт
      this.logger.log(`Invoice ${id} is paid. Amount: ${result.paid_amount}`);
    } else {
      this.logger.warn(`Invoice ${id} not paid yet`);
    }

    return { status: 'received' };
  }
}
