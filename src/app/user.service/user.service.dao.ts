import { Injectable } from '@nestjs/common';
import { Between, DataSource, IsNull, Like, Not, Repository } from 'typeorm';
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

  countDemand = async (limit: number) => {
    const result = await this.db
      .createQueryBuilder('item')
      .select('item.assessmentId', 'assessmentId')
      .addSelect('SUM(count)', 'sum')
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

  updateCount = async (id: number, count: number, used: number) => {
    const res = await this.db.findOne({ where: { id: id } });
    res.count += count;
    res.usedUserCount += used;
    await this.db.save(res);
  };

  findByUser = async (assId: number, id: number, service: number) => {
    // const responses = await this.dao.findByUser(assId, id);
    // const res = [];
    // for (const response of responses) {
    //   const exams = response.exams;
    //   const examResults = [];
    //   for (const exam of exams) {
    //     const result = await this.result.findOne(exam.code);
    //     examResults.push({
    //       ...exam,
    //       result: result,
    //     });
    //   }
    //   res.push({ ...response, exams: examResults });
    // }
    // return res;

    const [data, count] = await this.db.findAndCount({
      where: {
        id: service == 0 ? Not(IsNull()) : service,
        user: {
          id: id,
        },
        assessment: {
          id: assId == 0 ? Not(assId) : assId,
        },
      },
      relations: ['assessment', 'exams', 'user'],
    });
    const total = await this.db.count();
    return { data, count, total };
  };
}
