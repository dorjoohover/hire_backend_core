import { Module } from '@nestjs/common';
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
import { PdfService } from '../exam/pdf.service';
import { VisualizationService } from '../exam/visualization.service';
import { SinglePdf } from '../exam/reports/single.pdf';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Module({
  imports: [HttpModule],
  controllers: [UserServiceController],
  providers: [
    UserServiceService,
    UserServiceDao,
    TransactionDao,
    ExamService,
    UserDao,
    AuthService,
    JwtService,
    UserService,
    ExamDetailDao,
    PaymentDao,
    QuestionService,
    QuestionCategoryDao,
    QuestionDao,
    PdfService,
    VisualizationService,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    QuestionAnswerCategoryDao,
    FormuleService,
    UserAnswerDao,
    AssessmentDao,
    ExamDao,
    QpayService,
    SinglePdf,
  ],
})
export class UserServiceModule {}
