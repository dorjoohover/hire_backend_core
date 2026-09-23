import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ReportAccessService } from './report-access.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

/**
 * Тайлангийн paywall (monetization) endpoint-ууд.
 *
 *   GET  /report-access/:code                     — эрхийн төлөв
 *   POST /report-access/:code/invoice             — QPay нэхэмжлэх үүсгэх
 *   GET  /report-access/:code/check/:invoiceId    — төлбөр шалгах / эрх нээх
 *   GET  /report-access/callback/:accessId        — QPay callback (эрх автоматаар нээх)
 */
@Controller('report-access')
@ApiBearerAuth('access-token')
export class ReportAccessController {
  constructor(private readonly service: ReportAccessService) {}

  /**
   * QPay callback — `createInvoice` дотор `callback_url` болгож дамжуулсан:
   *   <QPAY_REPORT_CALLBACK>/<accessId>?qpay_payment_id=...
   * (QPAY_REPORT_CALLBACK = https://<api>/api/v1/report-access/callback)
   *
   * QPay дууддаг тул нэвтрэлтгүй (@Public). Төлбөрийг service дотор QPay-с
   * мөрийн өөрийн нэхэмжлэхээр дахин шалгана — URL / query-д итгэхгүй.
   * (`:code` route-оос өмнө зарлав.)
   */
  @Public()
  @Get('callback/:accessId')
  @ApiParam({ name: 'accessId' })
  @ApiQuery({ name: 'qpay_payment_id', required: false })
  async callback(
    @Param('accessId', ParseIntPipe) accessId: number,
    @Query('qpay_payment_id') qpayPaymentId?: string,
  ) {
    return await this.service.handleCallback(accessId, qpayPaymentId);
  }

  // Тайлангийн хуудас нэвтрэлтгүй ч нээгддэг (exam code нь түлхүүр) тул
  // энэ нь @Public. Хэрэглэгч байвал role-оор нь чөлөөлөлт бодогдоно.
  @Public()
  @Get(':code')
  @ApiParam({ name: 'code' })
  async state(@Param('code') code: string, @Request() { user }) {
    return await this.service.resolve(code, user);
  }

  @Public()
  @Post(':code/invoice')
  @ApiParam({ name: 'code' })
  async invoice(@Param('code') code: string, @Request() { user }) {
    return await this.service.createInvoice(code, user);
  }

  @Public()
  @Get(':code/check/:invoiceId')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'invoiceId' })
  async check(
    @Param('code') code: string,
    @Param('invoiceId') invoiceId: string,
    @Request() { user },
  ) {
    if (!invoiceId) {
      throw new HttpException('Нэхэмжлэх дугаар алга.', HttpStatus.BAD_REQUEST);
    }
    return await this.service.checkPayment(code, invoiceId, user);
  }
}
