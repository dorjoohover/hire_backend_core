import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { BaseService } from 'src/base/base.service';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { PaymentType } from 'src/base/constants';
import { ExamDao } from '../exam/dao/exam.dao';
import { Role } from 'src/auth/guards/role/role.enum';

@Injectable()
export class PaymentService extends BaseService {
  constructor(
    private dao: PaymentDao,
    private userDao: UserDao,
    private transactionDao: TransactionDao,
    private examDao: ExamDao,
  ) {
    super();
  }
  public async create(createPaymentDto: CreatePaymentDto, user: number) {
    const payment = await this.dao.create({ ...createPaymentDto, user: user });
    await this.userDao.updateWallet(user, createPaymentDto.totalPrice);
    await this.transactionDao.create({
      price: createPaymentDto.totalPrice,
      payment: payment,
      user: user,
    });
    return payment;
  }

  public async charge(
    id: number,
    amount: number,
    message: string,
    user: number,
  ) {
    const payment = await this.dao.create({
      method: PaymentType.BANK,
      totalPrice: amount,
      user: id,
      charger: user,
      message: message,
    });
    if (payment) {
      await this.userDao.updateWallet(id, amount);
    }
  }

  public async findAll(role: number, page: number, limit: number, user: any) {
    const transactions = await this.transactionDao.findAll(
      page,
      limit,
      user['id'],
    );
    const res = [];
    for (const transaction of transactions) {
      const serviceId = transaction.service.id;
      const exams = await this.examDao.findByService(serviceId);
      for (const exam of exams) {
        if (user['role'] == Role.client) {
          res.push({
            paymentDate: transaction.createdAt,
            assessment: exam.assessment.name,
            userEndDate: exam.userEndDate,
            userStartDate: exam.userStartDate,
            price: transaction.service.price,
          });
        }
        if (user['role'] == Role.organization) {
          res.push({
            paymentDate: transaction.createdAt,
            assessment: exam.assessment.name,
            userEndDate: exam.userEndDate,
            userStartDate: exam.userStartDate,
            price: transaction.service.price,
            count: transaction.service.count,
            usedUserCount: transaction.service.usedUserCount,
          });
        }
      }
    }

    if (user['role'] == Role.organization) {
      const payments = await this.dao.findAll(role, page, limit);
      for (const payment of payments) {
        res.push({
          paymentDate: payment.createdAt,
          price: payment.totalPrice,
          admin: payment.charger,
        });
      }
    }
    return res;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
