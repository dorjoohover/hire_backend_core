import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SUPER } from 'src/auth/guards/role/role.decorator';
import { MonitorGuard } from './monitor.guard';
import { MonitorService } from './monitor.service';

// №11-P1: гол flow-уудын хяналт (унших-л). Бүгд super admin (эсвэл MONITOR_ROLES) +
// MonitorGuard; PII (нэр / и-мэйл / утас) буцаадаггүй.
@SUPER()
@UseGuards(MonitorGuard)
@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  @Get('overview')
  overview(@Query('range') range?: string) {
    return this.monitor.overview(this.monitor.parseRange(range));
  }

  @Get('funnel')
  funnel(@Query('range') range?: string) {
    return this.monitor.funnel(this.monitor.parseRange(range));
  }

  @Get('reports')
  reports(@Query('range') range?: string, @Query('state') state?: string) {
    return this.monitor.reports(
      this.monitor.parseRange(range),
      this.monitor.parseState(state),
    );
  }

  @Get('payments')
  payments(@Query('range') range?: string) {
    return this.monitor.payments(this.monitor.parseRange(range));
  }

  @Get('errors')
  errors(@Query('range') range?: string) {
    return this.monitor.errors(this.monitor.parseRange(range));
  }

  @Get('services')
  services(@Query('threshold') threshold?: string) {
    return this.monitor.services(this.monitor.parseThreshold(threshold));
  }

  @Get('health')
  health() {
    return this.monitor.health();
  }
}
