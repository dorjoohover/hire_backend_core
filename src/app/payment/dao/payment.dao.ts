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
import { PaginationDto } from 'src/base/decorator/pagination';

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

  findAll = async (pg: PaginationDto, user: number) => {
    const { role, startDate, endDate, payment, assessmentId, limit, page } = pg;
    const where = pg?.assessmentId
      ? {
          user: {
            role: role == 0 ? Not(role) : role,
            id: user == 0 ? Not(0) : user,
          },
          createdAt:
            endDate && startDate ? Between(startDate, endDate) : Not(IsNull()),
          totalPrice: role == Role.organization ? Not(IsNull()) : MoreThan(0),
          method: payment ? In([payment, 4]) : Not(0),
          assessment: { id: assessmentId },
        }
      : {
          user: {
            role: role == 0 ? Not(role) : role,
            id: user == 0 ? Not(0) : user,
          },
          createdAt:
            endDate && startDate ? Between(startDate, endDate) : Not(IsNull()),
          totalPrice: role == Role.organization ? Not(IsNull()) : MoreThan(0),
          method: payment ? In([payment, 4]) : Not(0),
        };
    return await this.db.findAndCount({
      where: where,
      relations: ['user', 'charger', 'assessment'],
      take: limit,
      order: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
    });
  };

  findAdmin = async (pg: PaginationDto) => {
    const res = this.db
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('SUM(payment."totalPrice")', 'total');

    if (pg.endDate && pg.startDate) {
      res.andWhere('payment."createdAt" BETWEEN :start AND :end', {
        start: pg.startDate,
        end: pg.endDate,
      });
    }

    if (pg.assessmentId) {
      res.andWhere('payment."assessmentId" = :id', {
        id: pg.assessmentId,
      });
    }

    if (pg.role) {
      res.innerJoin('users', 'user', 'payment."userId" = user.id');
      res.andWhere('user.role = :role', {
        role: pg.role,
      });
    }
    if (pg.assessmentName) {
      res.innerJoin(
        'assessment',
        'assessment',
        'payment."assessmentId" = assessment.id',
      );
      res.andWhere('assessment."assessmentName" LIKE :name', {
        name: `%${pg.assessmentName}%`,
      });
    }
    if (pg.payment) {
      res.andWhere('payment.method = :payment or payment.method = 4', {
        payment: pg.payment,
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
