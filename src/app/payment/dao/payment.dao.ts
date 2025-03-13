import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { CreatePaymentDto, DateDto } from '../dto/create-payment.dto';

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

  findAll = async (
    role: number,
    page: number,
    limit: number,
    user: number,
    date?: DateDto,
    cost = true,
  ) => {
    return await this.db.find({
      where: {
        user: {
          role: role == 0 ? Not(role) : role,
          id: user == 0 ? Not(0) : user,
        },
        createdAt:
          date?.endDate && date?.startDate
            ? Between(date.startDate, date.endDate)
            : Not(IsNull()),
        totalPrice: !cost ? MoreThan(0) : Not(IsNull()),
      },
      relations: ['user', 'charger'],
      take: limit,
      skip: (page - 1) * limit,
    });
  };

  findAdmin = async (date: DateDto) => {
    const res = this.db
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('SUM(payment."totalPrice")', 'total');

    if (date.endDate && date.startDate) {
      res.where(
        'payment."createdAt" <= :end AND payment."createdAt" >= :start',
        {
          end: date.endDate,
          start: date.startDate,
        },
      );
    }

    res.groupBy('payment.method');

    return await res.getRawMany();
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
