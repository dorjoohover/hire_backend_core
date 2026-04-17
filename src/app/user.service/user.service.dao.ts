import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  IsNull,
  Like,
  Not,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { UserServiceEntity } from './entities/user.service.entity';
import { CreateUserServiceDto } from './dto/create-user.service.dto';
import { AssessmentStatus, PaymentStatus } from 'src/base/constants';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class UserServiceDao {
  private db: Repository<UserServiceEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserServiceEntity);
  }

  create = async (dto: CreateUserServiceDto, price: number) => {
    const res = this.db.create({
      ...dto,
      price: price,
      user: { id: dto.user },
      assessment: { id: dto.assessment },
      status: price == 0 ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
    });
    await this.db.save(res);
    return res;
  };

  countByAssessment = async (id: number) => {
    const res = await this.db.count({
      where: {
        assessment: {
          id,
        },
      },
    });
    return res;
  };

  updateStatus = async (id: number, status: number) => {
    const res = await this.db.findOne({
      where: {
        id,
      },
      relations: ['assessment', 'user'],
    });
    res.status = status;
    await this.db.save(res);
    return res;
  };
  updateCount = async (id: number, count: number, used: number) => {
    console.log(id, count, used);
    const res = await this.db.findOne({ where: { id: id } });
    res.count += count;
    res.usedUserCount += used;
    await this.db.save(res);
  };

  countDemand = async (limit: number) => {
    const result = await this.db
      .createQueryBuilder('item')
      .select('item.assessmentId', 'assessmentId')
      .addSelect('SUM(item.count)', 'sum')
      .innerJoin('item.assessment', 'a')
      .where('a.status NOT IN (:...status)', {
        status: [AssessmentStatus.ONLY, AssessmentStatus.ARCHIVE],
      })
      .groupBy('item.assessmentId')
      .orderBy('sum', 'DESC')
      .limit(limit)
      .getRawMany();
    return result;
  };

  findAll = async (pg: PaginationDto) => {
    const whereCondition: any = {
      createdAt:
        pg.endDate && pg.startDate
          ? Between(pg.startDate, pg.endDate)
          : Not(IsNull()),
    };

    // Only add email condition if pg.email exists
    if (pg.email) {
      whereCondition.user = {
        email: Like(`%${pg.email}%`),
      };
    }

    const [data, count] = await this.db.findAndCount({
      where: { ...whereCondition },
      take: pg.limit,
      skip: (pg.page == 0 ? 0 : pg.page - 1) * pg.limit,
      relations: ['assessment', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });
    const total = await this.db.count();
    return { data, count, total };
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['assessment', 'user', 'exams'],
    });
  };

  private applyUserSort(
    query: SelectQueryBuilder<UserServiceEntity>,
    sortBy?: string,
    sortDir?: string,
  ) {
    const direction: 'ASC' | 'DESC' =
      `${sortDir ?? 'DESC'}`.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedSorts: Record<string, string> = {
      createdAt: 'service.createdAt',
      price: 'service.price',
      count: 'service.count',
      usedUserCount: 'service.usedUserCount',
      status: 'service.status',
      assessmentName: 'assessment.name',
    };
    const sortColumn = allowedSorts[sortBy] ?? allowedSorts.createdAt;

    query.orderBy(sortColumn, direction);
    query.addOrderBy('exams.userEndDate', 'DESC');
    query.addOrderBy('exams.createdAt', 'DESC');

    return {
      sortBy: allowedSorts[sortBy] ? sortBy : 'createdAt',
      sortDir: direction,
    };
  }

  findByUser = async (
    assId: number,
    id: number,
    service: number,
    pg: PaginationDto,
  ) => {
    const page = Math.max(+(pg?.page ?? 1), 1);
    const limit = Math.max(+(pg?.limit ?? 20), 1);
    const query = this.db
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.assessment', 'assessment')
      .leftJoinAndSelect('service.exams', 'exams')
      .leftJoinAndSelect('service.user', 'user')
      .where('user.id = :id', { id });

    if (service !== 0) {
      query.andWhere('service.id = :service', { service });
    }

    if (assId !== 0) {
      query.andWhere('assessment.id = :assId', { assId });
    }

    const normalizedSort = this.applyUserSort(query, pg?.sortBy, pg?.sortDir);
    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      count: data.length,
      total,
      page,
      limit,
      ...normalizedSort,
    };
  };
}
