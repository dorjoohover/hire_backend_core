import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Request,
  Query,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { StudioDto } from './studio.dto';

@Public()
@Controller('report')
export class ReportController {
  constructor(private readonly reportsService: ReportService) {}

  // Клиент тайлан хүсэх

  @Post()
  async create(@Body() dto: any, @Request() { user }) {
    return this.reportsService.createReport(dto, user?.role);
  }

  @Get('template')
  async listTemplates(
    @Query('assessmentId') assessmentId?: string,
    @Query('reportType') reportType?: string,
    @Query('reportTypeCode') reportTypeCode?: string,
  ) {
    return await this.reportsService.listTemplates({
      assessmentId: assessmentId ? +assessmentId : undefined,
      reportType: reportType || undefined,
      reportTypeCode: reportTypeCode ? +reportTypeCode : undefined,
    });
  }

  @Get('template/resolve')
  async resolveTemplate(
    @Query('assessmentId') assessmentId: string,
    @Query('reportType') reportType?: string,
    @Query('reportTypeCode') reportTypeCode?: string,
  ) {
    return await this.reportsService.resolveTemplate({
      assessmentId: +assessmentId,
      reportType: reportType || undefined,
      reportTypeCode: reportTypeCode ? +reportTypeCode : undefined,
    });
  }

  @Get('template/:id')
  async getTemplate(@Param('id') id: string) {
    const parsedId = Number(id);
    return await this.reportsService.getTemplate(
      Number.isFinite(parsedId) ? parsedId : id,
    );
  }

  @Post('template')
  async saveTemplate(@Body() dto: Partial<StudioDto>, @Request() { user }) {
    return await this.reportsService.saveTemplate(dto, user?.id ?? 0);
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
