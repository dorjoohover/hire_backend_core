import { Module } from '@nestjs/common';
import { BarimtService } from './barimt.service';

import { HttpModule, HttpService } from '@nestjs/axios';
import { BarimtController } from './barimt.controller';

@Module({
  imports: [HttpModule],
  controllers: [BarimtController],
  providers: [BarimtService],
})
export class BarimtModule {}
