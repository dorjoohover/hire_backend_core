import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { AiService } from './ai.service';

@Controller('ai')
@ApiBearerAuth('access-token')
export class AiController {
  constructor(private readonly ai: AiService) {}

  // Ажлын байрны нэр/тайлбараар тохирох тестүүдийг санал болгоно (Studio AI Data + variable дээр суурилна).
  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Post('recommend-tests')
  recommendTests(@Body() dto: { jobTitle: string; jobDescription?: string; limit?: number }) {
    return this.ai.recommendTests(dto?.jobTitle, dto?.jobDescription, dto?.limit);
  }

  // Байгууллагын dashboard — нэг service-ийн оролцогчдын AI дүгнэлт. Шинэ үр дүн ирэхэд л дахин үүснэ.
  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Get('org-summary/:serviceId')
  @ApiParam({ name: 'serviceId' })
  orgSummary(@Param('serviceId') serviceId: string, @Request() { user }) {
    return this.ai.orgSummary(+serviceId, { id: +user['id'], role: +user['role'] });
  }

  // Чат widget — байгууллага болон хувь хүн (client): тест, өөрийн тайлангийн тайлбар, нэмэлт тест.
  @Roles(Role.client, Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Post('chat')
  chat(@Body() dto: { messages?: unknown; path?: string }, @Request() { user }) {
    return this.ai.chat(dto?.messages, dto?.path, { id: +user['id'], role: +user['role'], email: user['email'], phone: user['phone'] });
  }

  // Чат widget-ийн бэлэн асуултууд (тухайн хуудсанд), хариу нь хадгалагдсан бол 0 token.
  @Roles(Role.client, Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Get('faq')
  faq(@Query('path') path: string, @Request() { user }) {
    return this.ai.faqList(path, { id: +user['id'], role: +user['role'] });
  }

  @Roles(Role.client, Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Post('faq/answer')
  faqAnswer(@Body() dto: { question?: string; path?: string }, @Request() { user }) {
    return this.ai.faqAnswer(dto?.question, dto?.path, { id: +user['id'], role: +user['role'] });
  }
}
