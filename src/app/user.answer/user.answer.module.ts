import { forwardRef, Module } from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import { UserAnswerController } from './user.answer.controller';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { FormuleService } from '../formule/formule.service';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { ExamService } from '../exam/exam.service';
import { ExamDetailDao } from '../exam/dao/exam.detail.dao';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { UserDao } from '../user/user.dao';
import { jwtConstants } from 'src/auth/constants';

import { ResultDao } from '../exam/dao/result.dao';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { PaymentDao } from '../payment/dao/payment.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { FileService } from 'src/file.service';
import { BullModule } from '@nestjs/bullmq';
import { ReportService } from '../report/report.service';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { ExamModule } from '../exam/exam.module';
import { ReportModule } from '../report/report.module';
import { UserServiceService } from '../user.service/user.service.service';
import { UserServiceModule } from '../user.service/user.service.module';
@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
    BullModule.registerQueue({
      name: 'report', // 👈 queue name
    }),
    forwardRef(() => ExamModule),
    forwardRef(() => UserServiceModule),

    forwardRef(() => ReportModule),
  ],
  controllers: [UserAnswerController],
  providers: [
    UserAnswerService,
    UserAnswerDao,
    QuestionDao,
    EmailLogService,
    EmailLogDao,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    AssessmentDao,
    FormuleService,
    FileService,
    TransactionDao,
    PaymentDao,
    UserServiceDao,
    ResultDao,
    ExamDetailDao,
    AuthService,
    UserService,
    UserDao,
    QuestionService,
    QuestionCategoryDao,
    QuestionAnswerCategoryDao,
  ],
  exports: [UserAnswerService, UserAnswerDao],
})
export class UserAnswerModule {}
