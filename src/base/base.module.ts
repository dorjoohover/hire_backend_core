import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';
import { AppLogger } from './logger';
import { CacheService } from './cache.service';
import { MetricsService } from './metrics.service';

@Module({
  providers: [BaseService, BaseController, AppLogger, CacheService, MetricsService],
  exports: [BaseService, BaseController, AppLogger, CacheService, MetricsService],
})
export class BaseModule {}
