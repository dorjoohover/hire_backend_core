import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';
import { AppLogger } from './logger';
import { CacheService } from './cache.service';

@Module({
  providers: [BaseService, BaseController, AppLogger, CacheService],
  exports: [BaseService, BaseController, AppLogger, CacheService],
})
export class BaseModule {}
