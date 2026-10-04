import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ReportPipelineService, SWEEP_QUEUE } from './report-pipeline.service';

/** v1.3.0: 5 мин тутам гацсан/FAILED v2 тайлан дахин оруулах (BullMQ job scheduler). */
@Processor(SWEEP_QUEUE, { concurrency: 1 })
export class ReportSweepProcessor extends WorkerHost {
  constructor(private readonly pipeline: ReportPipelineService) {
    super();
  }

  async process() {
    return this.pipeline.sweep();
  }
}
