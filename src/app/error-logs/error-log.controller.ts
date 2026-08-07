import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ErrorLogService } from './error-log.service';
import { Role } from 'src/auth/guards/role/role.enum';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

// Зөвхөн супер админд (role=10) зориулсан — цаашид бусад admin/tester
// эрхэд нээхийг хүсвэл @Roles(...)-д Role.admin/Role.tester нэмнэ.
@ApiTags('ErrorLog')
@Controller('error-log')
@ApiBearerAuth('access-token')
export class ErrorLogController {
  constructor(private readonly errorLogService: ErrorLogService) {}

  @Roles(Role.super_admin)
  @Get()
  @PQ(['status', 'method'])
  findAll(@Pagination() pg: PaginationDto) {
    return this.errorLogService.findAll(pg);
  }
}
