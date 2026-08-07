import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { BaseModule } from 'src/base/base.module';
import { ErrorLogModule } from '../error-logs/error-log.module';

@Module({
  imports: [BaseModule, ErrorLogModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
