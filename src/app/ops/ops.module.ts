import { ReportPipelineModule } from '../report/report-pipeline.module';
import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsService } from './ops.service';
import { ReportLogDao } from '../report/report.log.dao';

@Module({
  imports: [ReportPipelineModule], // v1.3.0
  controllers: [OpsController],
  providers: [OpsService, ReportLogDao],
})
export class OpsModule {}
