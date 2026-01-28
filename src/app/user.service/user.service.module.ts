import { forwardRef, Module } from '@nestjs/common';
import { UserServiceService } from './user.service.service';
import { UserServiceController } from './user.service.controller';
import { UserServiceDao } from './user.service.dao';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { ExamService } from '../exam/exam.service';
import { UserDao } from '../user/user.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { ExamDetailDao } from '../exam/dao/exam.detail.dao';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { FormuleService } from '../formule/formule.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { QpayService } from '../payment/qpay.service';
import { HttpModule } from '@nestjs/axios';
import { PaymentDao } from '../payment/dao/payment.dao';
import { AuthService } from 'src/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { jwtConstants } from 'src/auth/constants';

import { ResultDao } from '../exam/dao/result.dao';
import { BarimtService } from '../barimt/barimt.service';
import { FileService } from 'src/file.service';
import { ReportService } from '../report/report.service';
import { BullModule } from '@nestjs/bullmq';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { EmailModule } from '../email/email.module';
import { ReportLogDao } from '../report/report.log.dao';

@Module({
  imports: [
    HttpModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),

    forwardRef(() => UserAnswerModule),
    forwardRef(() => EmailModule),
  ],
  controllers: [UserServiceController],
  providers: [
    UserServiceService,
    ReportService,
    UserServiceDao,
    FileService,
    ReportLogDao,
    EmailLogService,
    EmailLogDao,
    ResultDao,
    BarimtService,
    TransactionDao,
    ExamService,
    UserDao,
    AuthService,
    UserService,
    ExamDetailDao,
    PaymentDao,
    QuestionService,
    QuestionCategoryDao,
    QuestionDao,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    QuestionAnswerCategoryDao,
    FormuleService,
    UserAnswerDao,
    AssessmentDao,
    ExamDao,
    QpayService,
  ],
  exports: [UserServiceService, UserServiceDao],
})
export class UserServiceModule {}
