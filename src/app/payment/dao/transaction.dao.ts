import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TransactionEntity } from '../entities/transaction.entity';
import { CreateTransactionDto } from '../dto/create-transaction.dto';

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

  findAll = async (page: number, limit: number, user: number) => {
    return await this.db.find({
      where: {
        createdUser: user,
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
