import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import {
  InternalKeyGuard,
  InternalKeyGuardLenient,
} from 'src/auth/guards/internal/internal-key.guard';

// ⚠️ Өмнө нь class-level `@Public()` байсан тул `POST /report` (дурын body-г
// report VPS руу дамжуулж queue-д ажил оруулна) ба `GET /report/mail/:code`
// (report_logs.status-ыг SENT болгож мэйл илгээнэ) хэн ч дуудах боломжтой байв.
// Одоо зөвхөн `status` нээлттэй (web-д хэрэгтэй); бусад нь дотоод түлхүүртэй
// (`INTERNAL_API_KEY`, `x-internal-key` header — InternalKeyGuard; `mail` нь
// шилжилтийн үед түлхүүргүйг нэвтрүүлдэг InternalKeyGuardLenient).
@Controller('report')
export class ReportController {
  constructor(private readonly reportsService: ReportService) {}

  // Дотоод дуудлага (нэвтрэлт: InternalKeyGuard). @Public() нь зөвхөн global
  // JwtAuthGuard-ыг алгасахад хэрэгтэй.
  @Public()
  @UseGuards(InternalKeyGuard)
  @Post()
  async create(@Body() dto: any, @Request() { user }) {
    return this.reportsService.createReport(dto, user?.role);
  }

  // web хүлээж авах тул нээлттэй хэвээр.
  @Public()
  @Get(':id/status')
  async status(@Param('id') id: string) {
    return this.reportsService.getStatus(id);
  }

  // hire_report тайлан дууссаны дараа дууддаг (дотоод). Түлхүүр тохируулсан бол
  // заавал шаардана; тохируулаагүй үед (шилжилт) нэвтрүүлнэ — InternalKeyGuardLenient.
  @Public()
  @UseGuards(InternalKeyGuardLenient)
  @Get('mail/:code')
  async sendMail(@Param('code') code: string) {
    return this.reportsService.sendMail(code);
  }
}
