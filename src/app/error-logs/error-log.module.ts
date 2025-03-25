import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorLog } from './error-log.entity';
import { ErrorLogService } from './error-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorLog])],
  providers: [ErrorLogService],
  exports: [ErrorLogService],
})
export class ErrorLogModule {}