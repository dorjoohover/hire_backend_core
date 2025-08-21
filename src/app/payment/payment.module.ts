import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { UserDao } from '../user/user.dao';
import { QpayService } from './qpay.service';
import { QpayController } from './qpay.controller';
import { HttpModule } from '@nestjs/axios';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QuestionDao } from '../question/dao/question.dao';
@Module({
  imports: [HttpModule],
  controllers: [PaymentController, QpayController],
  providers: [
    PaymentService,
    ExamDao,
    PaymentDao,
    QpayService,
    TransactionDao,
    UserDao,
    AssessmentDao,
    QuestionDao,
  ],
})
export class PaymentModule {}
