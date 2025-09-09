import { Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';

import { HttpModule, HttpService } from '@nestjs/axios';
import { BarimtController } from './barimt.controller';
import { EmailLogModule } from '../email_log/email_log.module';
import { EmailLogService } from '../email_log/email_log.service';
import { EmailLogDao } from '../email_log/email_log.dao';

@Module({
  imports: [HttpModule, EmailLogModule],
  controllers: [BarimtController],
  providers: [BarimtService, EmailLogService, EmailLogDao],
})
export class BarimtModule {}
