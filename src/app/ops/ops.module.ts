import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';
import { ReportLogDao } from '../report/report.log.dao';

@Module({
  controllers: [OpsController],
  providers: [OpsService, ReportLogDao],
})
export class OpsModule {}
