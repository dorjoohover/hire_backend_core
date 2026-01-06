import { forwardRef, Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionService } from '../question/question.service';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { FormuleService } from '../formule/formule.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { AuthService } from 'src/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { jwtConstants } from 'src/auth/constants';

import { ResultDao } from './dao/result.dao';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { PaymentDao } from '../payment/dao/payment.dao';
import { FileService } from 'src/file.service';
import { ReportService } from '../report/report.service';
import { BullModule } from '@nestjs/bullmq';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { ReportModule } from '../report/report.module';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';
@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
    forwardRef(() => UserAnswerModule),
    forwardRef(() => UserServiceModule),
  ],
  controllers: [ExamController],
  providers: [
    EmailLogService,
    EmailLogDao,
    ExamService,
    ReportService,
    ExamDao,
    ExamDetailDao,
    QuestionDao,
    QuestionCategoryDao,
    AssessmentDao,
    QuestionService,
    FileService,
    AssessmentDao,
    ResultDao,
    TransactionDao,
    UserServiceDao,
    PaymentDao,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    FormuleService,

    AuthService,
    UserService,
    UserDao,
    QuestionAnswerCategoryDao,
  ],
  exports: [ExamService, ExamDao],
})
export class ExamModule {}
