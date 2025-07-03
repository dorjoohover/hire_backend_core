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
  @Post('callback')
  async handleCallback(@Body() body: any): Promise<any> {
    this.logger.log('Received QPay callback:', body);

    const invoiceId = body?.invoice_id;

    if (!invoiceId) {
      this.logger.warn('Callback without invoice_id');
      return { status: 'missing invoice_id' };
    }

    // Баталгаажуулах (optional)
    const result = await this.service.checkPayment(invoiceId);

    if (result?.paid_amount > 0) {
      // 📌 Энд таны бизнесийн логик: төлбөрийн статус хадгалах, хэрэглэгчт мэдэгдэх гэх мэт
      this.logger.log(
        `Invoice ${invoiceId} is paid. Amount: ${result.paid_amount}`,
      );
    } else {
      this.logger.warn(`Invoice ${invoiceId} not paid yet`);
    }

    return { status: 'received' };
  }
}
