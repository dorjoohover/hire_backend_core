import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CALC_QUEUE, ReportPipelineService, SWEEP_QUEUE } from './report-pipeline.service';
import { ReportSweepProcessor } from './report-sweep.processor';

/** v1.3.0 тайлангийн pipeline — ReportModule ба OpsModule хоёулаа ашиглана. */
@Module({
  imports: [BullModule.registerQueue({ name: CALC_QUEUE }, { name: SWEEP_QUEUE })],
  providers: [ReportPipelineService, ReportSweepProcessor],
  exports: [ReportPipelineService],
})
export class ReportPipelineModule {}
