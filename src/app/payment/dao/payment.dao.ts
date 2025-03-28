import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { PaymentEntity } from '../entities/payment.entity';
import { AdminDto, CreatePaymentDto, DateDto } from '../dto/create-payment.dto';
import { Role } from 'src/auth/guards/role/role.enum';

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
      assessment:
        dto.assessment != 0
          ? {
              id: dto.assessment,
            }
          : null,
    });
    await this.db.save(res);
    return res.id;
  };

  findAll = async (
    role: number,
    page: number,
    limit: number,
    user: number,
    dto?: AdminDto,
  ) => {

    return await this.db.findAndCount({
      where: {
        user: {
          role: role == 0 ? Not(role) : role,
          id: user == 0 ? Not(0) : user,
        },
        createdAt:
          dto?.endDate && dto?.startDate
            ? Between(dto.startDate, dto.endDate)
            : Not(IsNull()),
        totalPrice: role == Role.organization ? Not(IsNull()) : MoreThan(0),
        method: dto.payment ? In([dto.payment, 4]) : Not(0),
        assessment: dto.assessmentId ? { id: dto.assessmentId } : Not(-1),
      },
      relations: ['user', 'charger', 'assessment'],
      take: limit,
      order: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
    });
  };

  findAdmin = async (dto: AdminDto) => {
    const res = this.db
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('SUM(payment."totalPrice")', 'total');

    if (dto.endDate && dto.startDate) {
      res.andWhere('payment."createdAt" BETWEEN :start AND :end', {
        start: dto.startDate,
        end: dto.endDate,
      });
    }

    if (dto.assessmentId) {
      res.andWhere('payment."assessmentId" = :id', {
        id: dto.assessmentId,
      });
    }

    if (dto.role) {
      res.innerJoin('users', 'user', 'payment."userId" = user.id');
      res.andWhere('user.role = :role', {
        role: dto.role,
      });
    }

    if (dto.payment) {
      res.andWhere('payment.method = :payment or payment.method = 4', {
        payment: dto.payment,
      });
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
