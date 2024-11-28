import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { UserDao } from '../user/user.dao';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, PaymentDao, TransactionDao, UserDao],
})
export class PaymentModule {}
