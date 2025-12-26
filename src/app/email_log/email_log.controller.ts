import { Controller, Get, Param, Delete, Put, Post } from '@nestjs/common';
import { EmailLogService } from './email_log.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { EmailLogType } from 'src/base/constants';
@ApiBearerAuth('access-token')
@Controller('email_log')
export class EmailLogController {
  constructor(private readonly emailLogService: EmailLogService) {}

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Get('all')
  @PQ(['user', 'status', 'email', 'type', 'startDate', 'endDate'])
  findAll(@Pagination() pg: PaginationDto) {
    return this.emailLogService.findAll(pg);
  }

  @Roles(Role.super_admin, Role.admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emailLogService.deleteOne(+id);
  }
}
