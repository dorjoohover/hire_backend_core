import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Role } from 'src/auth/guards/role/role.enum';
import { Roles } from 'src/auth/guards/role/role.decorator';

// Зөвхөн супер админд (role=10) зориулсан — admin-ийн "Ачаалал" хуудсанд ашиглана
@ApiTags('Health')
@Controller('health')
@ApiBearerAuth('access-token')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Roles(Role.super_admin)
  @Get('metrics')
  getMetrics() {
    return this.healthService.getMetrics();
  }
}
