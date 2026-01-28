import { Controller, Post, Body, Param, Get, Request } from '@nestjs/common';
import { ReportService } from './report.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Public()
@Controller('report')
export class ReportController {
  constructor(private readonly reportsService: ReportService) {}

  // Клиент тайлан хүсэх

  @Post()
  async create(@Body() dto: any, @Request() { user }) {
    return this.reportsService.createReport(dto, user.role);
  }

  @Get(':id/status')
  async status(@Param('id') id: string) {
    return this.reportsService.getStatus(id);
  }
  @Get('mail/:code')
  async sendMail(@Param('code') code: string) {
    return this.reportsService.sendMail(code);
  }
}
