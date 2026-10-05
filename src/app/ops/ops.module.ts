import { ReportPipelineModule } from '../report/report-pipeline.module';
import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';
import { OpsCleanupService } from './ops-cleanup.service';
import { ReportLogDao } from '../report/report.log.dao';

@Module({
  imports: [ReportPipelineModule], // v1.3.0
  controllers: [OpsController],
  providers: [OpsService, OpsCleanupService, ReportLogDao],
})
export class OpsModule {}
