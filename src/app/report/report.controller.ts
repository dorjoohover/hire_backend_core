import { Controller, Post, Body, Param, Get, Request } from '@nestjs/common';
import { ReportService } from './report.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import axios from 'axios';
import { REPORT_STATUS } from 'src/base/constants';

@Public()
@Controller('report')
export class ReportController {
  constructor(private readonly reportsService: ReportService) {}

  // Клиент тайлан хүсэх

  @Post()
  async create(@Body() dto: any, @Request() { user }) {
    return this.reportsService.createReport(dto, user.role);
  }

  // Report service дууссан гэдэг callback
  @Post(':id/callback')
  async callback(@Param('id') id: string, @Body() body: any) {
    const { status, result, progress, code } = body;
    console.log(body);
    if (status == REPORT_STATUS.COMPLETED) {
      this.reportsService.sendMail(id, code);
    }
  }
  @Get(':id/status')
  async status(@Param('id') id: string) {
    return this.reportsService.getStatus(id);
  }
}
