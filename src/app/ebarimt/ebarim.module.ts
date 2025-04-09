import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EbarimtService } from './ebarimt.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ebarimt', // 👈 must match the InjectQueue name
    }),
  ],
  providers: [EbarimtService],
  exports: [BullModule, EbarimtService], // 👈 export BullModule so the queue can be injected elsewhere
})
export class EbarimtModule {}