import { Module } from '@nestjs/common';
import { EmailLogService } from './email_log.service';
import { EmailLogController } from './email_log.controller';

@Module({
  controllers: [EmailLogController],
  providers: [EmailLogService],
})
export class EmailLogModule {}
