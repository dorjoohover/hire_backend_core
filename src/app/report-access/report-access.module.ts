import { forwardRef, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReportAccessService } from './report-access.service';
import { ReportAccessController } from './report-access.controller';
import { ReportAccessDao } from './report-access.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QpayService } from '../payment/qpay.service';
import { QuestionDao } from '../question/dao/question.dao';

@Module({
  imports: [HttpModule],
  controllers: [ReportAccessController],
  providers: [
    ReportAccessService,
    ReportAccessDao,
    ExamDao,
    AssessmentDao,
    QuestionDao,
    QpayService,
  ],
  exports: [ReportAccessService, ReportAccessDao],
})
export class ReportAccessModule {}
