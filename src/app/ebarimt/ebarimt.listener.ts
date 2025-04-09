import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { QueueEvents } from 'bullmq';

@Injectable()
export class EbarimtListener implements OnModuleInit, OnModuleDestroy {
  private queueEvents: QueueEvents;

  constructor() {
    this.queueEvents = new QueueEvents('ebarimt', {
      connection: { host: 'localhost', port: 6379 },
    });
  }

  async onModuleInit() {
    await this.queueEvents.waitUntilReady(); // Ensure QueueEvents is ready

    this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
      console.log(`✅ Job ${jobId} completed. Result:`, returnvalue);

      // Example: Store access token in MongoDB
      // await this.mongoService.saveToken(jobId, returnvalue.access_token);
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      console.error(`❌ Job ${jobId} failed. Reason:`, failedReason);
    });
  }

  async onModuleDestroy() {
    await this.queueEvents.close(); // Clean shutdown
  }
}
