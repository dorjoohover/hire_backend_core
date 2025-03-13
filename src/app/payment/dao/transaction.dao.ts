import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { DateDto } from '../dto/create-payment.dto';
import { PaymentDao } from './payment.dao';
import { PaymentType } from 'src/base/constants';

@Injectable()
export class TransactionDao {
  private db: Repository<TransactionEntity>;
  constructor(
    private dataSource: DataSource,
    private paymentDao: PaymentDao,
  ) {
    this.db = this.dataSource.getRepository(TransactionEntity);
  }

  create = async (dto: CreateTransactionDto, cost: number) => {
    // cost:0 zowhon zartsuulalt hj bga ued cost:1 mongo gargaad zartsuulalt hiih cost: 2 zowhon mongo gargah
    if (cost <= 1) {
      const res = this.db.create({
        ...dto,
        service: dto.service ? { id: dto.service } : null,
        payment: dto.payment ? { id: dto.payment } : null,
        createdUser: dto.user,
      });
      await this.db.save(res);
    }
    if (cost >= 1) {
      await this.paymentDao.create({
        message: dto.assesmentName
          ? `${Math.abs(dto.count)} ${dto.assesmentName}`
          : `Худалдан авалт хийсэн. ${dto.count} ${dto.price}`,
        totalPrice: -Math.abs(dto.price * (dto.count ?? 1)),
        method: PaymentType.COST,
        user: dto.user,
      });
    }
  };

  findAdmin = async (
    date: DateDto,
    page: number,
    limit: number,
    price = true,
  ) => {
    const res = await this.db.find({
      where: {
        createdAt:
          date.endDate && date.startDate
            ? Between(date.startDate, date.endDate)
            : Not(IsNull()),
        price: !price ? MoreThan(0) : Not(IsNull()),
      },
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: 'DESC',
      },
      relations: ['service', 'service.assessment'],
    });
    return res;
  };

  findAll = async (page: number, limit: number, user: number) => {
    return await this.db.find({
      where: {
        createdUser: user == 0 ? Not(0) : user,
      },
      take: limit,
      skip: (page - 1) * limit,

      order: {
        createdAt: 'DESC',
      },
      relations: ['service', 'service.exams'],
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      //   relations: ['level'],
    });
  };
}
