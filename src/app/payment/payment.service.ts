import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePaymentDto, DateDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { BaseService } from 'src/base/base.service';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { PaymentType } from 'src/base/constants';
import { ExamDao } from '../exam/dao/exam.dao';
import { Admins, Role } from 'src/auth/guards/role/role.enum';

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
  // public async create(createPaymentDto: CreatePaymentDto, user: number) {
  //   const payment = await this.dao.create({ ...createPaymentDto, user: user });
  //   await this.userDao.updateWallet(user, createPaymentDto.totalPrice);
  //   await this.transactionDao.create({
  //     price: createPaymentDto.totalPrice,
  //     payment: payment,
  //     user: user,
  //   });
  //   return payment;
  // }

  public async charge(
    id: number,
    amount: number,
    message: string,
    method: number,
    user: number,
  ) {
    const payment = await this.dao.create({
      method: method,
      totalPrice: amount,
      user: id,
      charger: user,
      message: message,
      assessment: null,
    });
    if (payment) {
      await this.userDao.updateWallet(id, amount);
    }
  }

  public async findAdmin(date: DateDto, page: number, limit: number) {
    const total = await this.dao.findAdmin(date);
    const payments = await this.dao.findAll(0, page, limit, 0, date);

    return {
      total,
      payments,
      // transactions,
    };
  }

  public async findAll(
    role: number,
    page: number,
    limit: number,
    user: any,
    userId: number,
  ) {
    let transactions = [];
    let payments = [];
    let transactionCount = 0,
      paymentCount = 0;
    const userInfo = await this.userDao.getUserInfo(userId);
    if (!userInfo)
      throw new HttpException('Хэрэглэгч олдсонгүй', HttpStatus.BAD_REQUEST);
    if (Admins.includes(+user['role'])) {
      const [res, count] = await this.transactionDao.findAll(
        page,
        limit,
        userId,
      );
      transactionCount = count;
      for (const transaction of res) {
        const serviceId = transaction.service.id;
        const exams = await this.examDao.findByService(serviceId);
        for (const exam of exams) {
          if (role == Role.client || userInfo.role == Role.client) {
            transactions.push({
              paymentDate: transaction.createdAt,
              assessment: exam.assessment,
              userEndDate: exam.userEndDate,
              userStartDate: exam.userStartDate,
              price: transaction.service.price,
            });
          }
          if (role == Role.organization || userInfo.role == Role.organization) {
            transactions.push({
              paymentDate: transaction.createdAt,
              assessment: exam.assessment,
              price: transaction.service.price,
              count: transaction.service.count,
              usedUserCount: transaction.service.usedUserCount,
            });
          }
        }
      }
    }

    const [res, count] = await this.dao.findAll(
      Admins.includes(+user['role'])
        ? userId
          ? userInfo.role
          : role
        : +user['role'],
      page,
      limit,
      Admins.includes(+user['role']) ? userId : user['id'],
    );
    paymentCount = count;
    for (const payment of res) {
      payments.push({
        message: payment.message,
        assessment: payment.assessment,
        paymentDate: payment.createdAt,
        price: payment.totalPrice,
        admin: user['role'] == Role.client ? null : payment.charger,
      });
    }
    return {
      transactions: {
        data: transactions,
        total: transactionCount,
      },
      payments: {
        data: payments,
        total: paymentCount,
      },
    };
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
