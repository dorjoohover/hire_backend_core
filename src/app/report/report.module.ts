import { forwardRef, Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { BullModule } from '@nestjs/bullmq';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { ExamDao } from '../exam/dao/exam.dao';
import { ExamDetailDao } from '../exam/dao/exam.detail.dao';
import { ResultDao } from '../exam/dao/result.dao';
import { ExamService } from '../exam/exam.service';
import { PaymentDao } from '../payment/dao/payment.dao';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionService } from '../question/question.service';
import { UserServiceDao } from '../user.service/user.service.dao';
import { FormuleService } from '../formule/formule.service';
import { FileService } from 'src/file.service';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({
      name: 'report',
    }),
    forwardRef(() => UserAnswerModule),
    forwardRef(() => UserServiceModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ReportController],
  providers: [
    ReportService,
    ExamService,
    ExamDao,
    ExamDetailDao,
    QuestionService,
    AuthService,
    ResultDao,
    TransactionDao,
    UserServiceDao,
    QuestionDao,
    QuestionCategoryDao,
    QuestionAnswerMatrixDao,
    AssessmentDao,
    QuestionAnswerDao,
    EmailLogDao,
    EmailLogService,
    QuestionAnswerCategoryDao,
    JwtService,
    PaymentDao,
    FormuleService,
    FileService,
  ],
  exports: [ReportService],
})
export class ReportModule {}
