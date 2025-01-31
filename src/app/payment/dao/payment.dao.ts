import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';

@Injectable()
export class PaymentDao {
  private db: Repository<PaymentEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(PaymentEntity);
  }

  create = async (dto: CreatePaymentDto) => {
    const res = this.db.create({
      ...dto,
      user: { id: dto.user },
      charger: dto.charger ? { id: dto.charger } : null,
    });
    await this.db.save(res);
    return res.id;
  };

  findAll = async (method: number, page: number, limit: number) => {
    return await this.db.find({
      where: {
        method: method,
      },
      relations: ['charger'],
      take: limit,
      skip: (page - 1) * limit,
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
