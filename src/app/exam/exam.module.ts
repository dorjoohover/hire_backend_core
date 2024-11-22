import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';

@Module({
  controllers: [ExamController],
  providers: [ExamService, ExamDao, ExamDetailDao],
})
export class ExamModule {}
