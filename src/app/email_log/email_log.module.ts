import { Module } from '@nestjs/common';
import { EmailLogService } from './email_log.service';
import { EmailLogController } from './email_log.controller';
import { EmailLogDao } from './email_log.dao';

@Module({
  controllers: [EmailLogController],
  providers: [EmailLogService, EmailLogDao],
  exports: [EmailLogService],
})
export class EmailLogModule {}
