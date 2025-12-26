import { forwardRef, Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';

import { HttpModule } from '@nestjs/axios';
import { BarimtController } from './barimt.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [HttpModule, forwardRef(() => EmailModule)],
  controllers: [BarimtController],
  providers: [BarimtService],
  exports: [BarimtService],
})
export class BarimtModule {}
