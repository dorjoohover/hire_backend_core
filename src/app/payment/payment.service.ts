import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentDao } from './dao/payment.dao';
import { TransactionDao } from './dao/transaction.dao';
import { BaseService } from 'src/base/base.service';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { PaymentType } from 'src/base/constants';

@Injectable()
export class PaymentService extends BaseService {
  constructor(
    private dao: PaymentDao,
    private userDao: UserDao,
    private transactionDao: TransactionDao,
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

  public async charge(id: number, amount: number, user: number) {
    const payment = await this.dao.create({
      method: PaymentType.BANK,
      totalPrice: amount,
      user: id,
      charger: user,
    });
    if (payment) {
      await this.userDao.updateWallet(id, amount);
    }
  }

  public async findAll(method: number, page: number, limit: number) {
    return await this.dao.findAll(method, page, limit)
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
