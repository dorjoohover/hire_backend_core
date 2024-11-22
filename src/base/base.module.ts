import { Module } from '@nestjs/common';
import { BaseController } from './base.controller';
import { BaseService } from './base.service';
import { AppLogger } from './logger';

@Module({
  providers: [BaseService, BaseController, AppLogger],
  exports: [BaseService, BaseController, AppLogger],
})
export class BaseModule {}
