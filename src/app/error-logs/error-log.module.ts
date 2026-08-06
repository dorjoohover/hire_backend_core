import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ErrorLog } from './error-log.entity';
import { ErrorLogService } from './error-log.service';
import { ErrorLogController } from './error-log.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ErrorLog])],
  controllers: [ErrorLogController],
  providers: [ErrorLogService],
  exports: [ErrorLogService],
})
export class ErrorLogModule {}