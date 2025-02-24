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

@Injectable()
export class TransactionDao {
  private db: Repository<TransactionEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(TransactionEntity);
  }

  create = async (dto: CreateTransactionDto) => {
    const res = this.db.create({
      ...dto,
      service: dto.service ? { id: dto.service } : null,
      payment: dto.payment ? { id: dto.payment } : null,
      createdUser: dto.user,
    });
    await this.db.save(res);
  };

  findAdmin = async (date: DateDto, page: number, limit: number) => {
    const res = await this.db.find({
      where: {
        createdAt:
          date.endDate && date.startDate
            ? Between(date.startDate, date.endDate)
            : Not(IsNull()),
      },
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: 'DESC',
      },
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
