import {
  Controller,
  Get,
  Param,
  Post,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ReportAccessService } from './report-access.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

/**
 * Тайлангийн paywall (monetization) endpoint-ууд.
 *
 *   GET  /report-access/:code                     — эрхийн төлөв
 *   POST /report-access/:code/invoice             — QPay нэхэмжлэх үүсгэх
 *   GET  /report-access/:code/check/:invoiceId    — төлбөр шалгах / эрх нээх
 */
@Controller('report-access')
@ApiBearerAuth('access-token')
export class ReportAccessController {
  constructor(private readonly service: ReportAccessService) {}

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
