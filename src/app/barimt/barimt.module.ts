import { forwardRef, Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';

import { HttpModule } from '@nestjs/axios';
import { BarimtController } from './barimt.controller';
import { EmailLogModule } from '../email_log/email_log.module';

@Module({
  imports: [HttpModule, forwardRef(() => EmailLogModule)],
  controllers: [BarimtController],
  providers: [BarimtService],
  exports: [BarimtService],
})
export class BarimtModule {}
