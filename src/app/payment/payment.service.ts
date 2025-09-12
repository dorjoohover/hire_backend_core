import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AdminDto, CreatePaymentDto, DateDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { BaseService } from 'src/base/base.service';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { PaymentType } from 'src/base/constants';
import { ExamDao } from '../exam/dao/exam.dao';
import { Admins, Role } from 'src/auth/guards/role/role.enum';
import { PaginationDto } from 'src/base/decorator/pagination';
import { UserEntity } from '../user/entities/user.entity';

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

  public async findAdmin(pg: PaginationDto) {
    const totalPrice = await this.dao.findAdmin(pg);
    const { data, count, total } = await this.dao.findAll(pg, 0);

    return {
      totalPrice,
      data: data,
      total: total,
      count,
      // transactions,
    };
  }

  public async findAll(pg: PaginationDto, user: UserEntity) {
    const { role, id } = pg;
    const userId = id;
    let transactions = [];
    let payments = [];
    let transactionCount = 0,
      transactionTotal = 0,
      paymentCount = 0,
      paymentTotal = 0;
    const userInfo = await this.userDao.getUserInfo(pg.id);
    if (!userInfo)
      throw new HttpException('Хэрэглэгч олдсонгүй', HttpStatus.BAD_REQUEST);
    if (Admins.includes(+user['role'])) {
      const { data, count, total } = await this.transactionDao.findAll(pg);
      transactionCount = count;
      transactionTotal = total;
      for (const transaction of data) {
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
              serviceId,
            });
          }
          if (role == Role.organization || userInfo.role == Role.organization) {
            transactions.push({
              paymentDate: transaction.createdAt,
              assessment: exam.assessment,
              price: transaction.service.price,
              count: transaction.service.count,
              usedUserCount: transaction.service.usedUserCount,
              serviceId,
            });
          }
        }
      }
    }

    const { data, total, count } = await this.dao.findAll(
      {
        ...pg,
        role: Admins.includes(+user['role'])
          ? userId
            ? userInfo.role
            : role
          : +user['role'],
      },
      Admins.includes(+user.role) ? userId : user['id'],
    );
    paymentCount = count;
    paymentTotal = total;
    for (const payment of data) {
      const arr = payment.message.split('-');
      payments.push({
        message: arr[0],
        assessment: payment.assessment,
        paymentDate: payment.createdAt,
        price: payment.totalPrice,
        serviceId: arr?.[1] ?? null,
        admin: user['role'] == Role.client ? null : payment.charger,
      });
    }
    return {
      transactions: {
        data: transactions,
        total: transactionTotal,
        count: transactionCount,
      },
      payments: {
        data: payments,
        total: paymentTotal,
        count: paymentCount,
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
