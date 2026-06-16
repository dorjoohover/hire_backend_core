import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  IsNull,
  Like,
  Not,
  Repository,
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

  /** N+1 арилгах: олон assessment-ийн count-ийг нэг query-аар авна */
  countByAssessmentBatch = async (ids: number[]): Promise<Map<number, number>> => {
    if (!ids.length) return new Map();
    const rows: { assessmentId: string; cnt: string }[] =
      await this.dataSource.query(
        `SELECT "assessmentId"::int AS "assessmentId", COUNT(*)::int AS cnt
         FROM "userService"
         WHERE "assessmentId" = ANY($1)
         GROUP BY "assessmentId"`,
        [ids],
      );
    return new Map(rows.map((r) => [Number(r.assessmentId), Number(r.cnt)]));
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

  findByUser = async (
    assId: number,
    id: number,
    service: number,
    pg?: PaginationDto,
    status?: number,
    examStatus?: string, // comma-separated: 'notStarted,started,completed'
  ) => {
    const page = pg?.page ?? 1;
    const limit = pg?.limit ?? 20;
    const sortDir: 'ASC' | 'DESC' =
      (pg?.sortDir?.toUpperCase() as 'ASC' | 'DESC') ?? 'DESC';

    const examStatusList = examStatus ? examStatus.split(',').map(s => s.trim()).filter(Boolean) : [];

    const applyExamStatus = (qb: any) => {
      if (!examStatusList.length) return;
      const conditions = [];
      if (examStatusList.includes('notStarted'))  conditions.push('(exams.userStartDate IS NULL AND exams.userEndDate IS NULL)');
      if (examStatusList.includes('started'))     conditions.push('(exams.userStartDate IS NOT NULL AND exams.userEndDate IS NULL)');
      if (examStatusList.includes('completed'))   conditions.push('(exams.userEndDate IS NOT NULL)');
      if (conditions.length) qb.andWhere(`(${conditions.join(' OR ')})`);
    };

    // Нийт service тоог тодорхойлох (хурдан)
    const countQuery = this.db
      .createQueryBuilder('service')
      .innerJoin('service.user', 'user')
      .where('user.id = :userId', { userId: id });

    if (assId !== 0) {
      countQuery
        .innerJoin('service.assessment', 'assessment')
        .andWhere('assessment.id = :assessmentId', { assessmentId: assId });
    }
    if (service !== 0) {
      countQuery.andWhere('service.id = :serviceId', { serviceId: service });
    }
    if (status !== undefined) {
      countQuery.andWhere('service.status = :status', { status });
    }
    if (examStatus) {
      countQuery.innerJoin('service.exams', 'exams');
      applyExamStatus(countQuery);
    }

    const total = await countQuery.getCount();

    // Paginated data
    const query = this.db
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.assessment', 'assessment')
      .leftJoinAndSelect('service.exams', 'exams')
      .leftJoinAndSelect('service.user', 'user')
      .where('user.id = :userId', { userId: id });

    if (service !== 0) {
      query.andWhere('service.id = :serviceId', { serviceId: service });
    }
    if (assId !== 0) {
      query.andWhere('assessment.id = :assessmentId', { assessmentId: assId });
    }
    if (status !== undefined) {
      query.andWhere('service.status = :status', { status });
    }
    if (examStatus) {
      applyExamStatus(query);
    }

    query
      .addOrderBy('service.createdAt', sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const data = await query.getMany();

    return {
      data,
      count: data.length,
      total,
    };
  };

  /** Нийт шалгуулагчдын тоог тусад нь авах (applicants tab) */
  countApplicantsByUser = async (userId: number) => {
    const result = await this.dataSource.query(
      `SELECT COUNT(e.id)::int AS total
       FROM "userService" s
       JOIN exam e ON e."serviceId" = s.id
       WHERE s."userId" = $1`,
      [userId],
    );
    return (result[0]?.total as number) ?? 0;
  };
}
