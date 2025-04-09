import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EbarimtService {
  constructor(
    @InjectQueue('ebarimt') private queue: Queue,
  ) {}

  async some(data: any) {
    return await this.queue.add('process', data);

  }
}
