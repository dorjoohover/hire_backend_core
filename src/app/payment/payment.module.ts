import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { UserDao } from '../user/user.dao';
import { QpayService } from './qpay.service';
import { QpayController } from './qpay.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [PaymentController, QpayController],
  providers: [PaymentService, PaymentDao, QpayService, TransactionDao, UserDao],
})
export class PaymentModule {}
