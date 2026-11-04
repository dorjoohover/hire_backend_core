import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserServiceService } from './user.service.service';

export const SCHEDULE_QUEUE = 'message-schedule';

/** Минут тутам товлосон урилга / сануулгын хугацаа болсныг илгээнэ (BullMQ job scheduler). */
@Processor(SCHEDULE_QUEUE, { concurrency: 1 })
export class MessageScheduleProcessor extends WorkerHost implements OnModuleInit {
  private readonly log = new Logger('MessageSchedule');

  constructor(
    private readonly svc: UserServiceService,
    @InjectQueue(SCHEDULE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit() {
    try {
      // Idempotent — бүх replica дуудсан ч НЭГ scheduler.
      await this.queue.upsertJobScheduler(
        'message-schedule',
        { every: 60_000 },
        { name: 'tick', data: {}, opts: { removeOnComplete: true, removeOnFail: 50 } },
      );
    } catch (e: any) {
      this.log.warn(`scheduler бүртгэж чадсангүй: ${e?.message ?? e}`);
    }
  }

  process() {
    return this.svc.runDueSchedules();
  }
}
