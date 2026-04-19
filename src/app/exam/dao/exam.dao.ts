import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  Not,
  Raw,
  Repository,
} from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { AdminExamDto, CreateExamDto } from '../dto/create-exam.dto';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';
import { AssessmentDao } from 'src/app/assessment/dao/assessment.dao';
import { ReportService } from 'src/app/report/report.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import { Role } from 'src/auth/guards/role/role.enum';

@Injectable()
export class ExamDao {
  private db: Repository<ExamEntity>;
  constructor(
    private dataSource: DataSource,
    private assessmentDao: AssessmentDao,
  ) {
    this.db = this.dataSource.getRepository(ExamEntity);
  }

  create = async (dto: CreateExamDto, user?: UserEntity) => {
    const res = this.db.create({
      ...dto,
      service: {
        id: dto.service,
      },
      firstname: user ? user.firstname : null,
      lastname: user ? user.lastname : null,
      email: user ? user.email : null,
      phone: user ? user.phone : null,
      assessmentName: dto.assessment.name,
      assessment: { id: dto.assessment.id },
      user: user
        ? {
            id: user?.id,
          }
        : null,
    });
    await this.db.save(res);
    return res.id;
  };

  update = async (code: string | number, dto: any) => {
    const res = await this.db.findOne({ where: { code: `${code}` } });
    if (dto.user) {
      await this.db.save({
        ...res,
        ...dto,
        user: {
          id: dto.user.id,
        },
      });
    } else {
      await this.db.save({ ...res, ...dto });
    }
  };

  count = async () => {
    return await this.db.count();
  };

  updateDate = async (code: string | number, dto: UpdateDateDto) => {
    const date = new Date(dto.endDate);
    // 8 tsagiin

    date.setHours(date.getHours() - 8);
    await this.db.update(
      { code: `${code}` },
      {
        // startDate: dto.startDate,
        endDate: date,
      },
    );
  };

  updateByCode = async (
    code: string,
    dto: { email: string; lastname: string; firstname: string; phone: string },
  ) => {
    const { email, lastname, firstname, phone } = dto;
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, email, lastname, firstname, phone });
  };
  updateByCodeJob = async (code: string, job: string) => {
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, job });
  };

  endExam = async (code: string) => {
    const res = await this.db.findOne({ where: { code } });
    await this.db.save({ ...res, userEndDate: new Date() });
  };

  findAll = async (assessmendId: number, email: string) => {
    return await this.db.find({
      where: {
        assessment: {
          id: assessmendId == 0 ? Not(0) : assessmendId,
        },
        email,
      },
      relations: ['service', 'assessment'],
    });
  };

  findAllNew = async (
    page: number,
    limit: number,
    filters: {
      assessment?: number;
      buyer?: number;
      email?: string;
      examstatus?: number;
      startDate?: string;
      endDate?: string;
    },
    sortBy:
      | 'createdAt'
      | 'userStartDate'
      | 'userEndDate'
      | 'startDate'
      | 'endDate'
      | 'email'
      | 'firstname'
      | 'lastname'
      | 'code'
      | 'visible'
      | 'assessmentName'
      | 'buyerOrganizationName'
      | 'examstatus' = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC',
  ) => {
    const p = +page || 1;
    const l = +limit || 10;

    const examStatusCase = `
    CASE
      WHEN e."userStartDate" IS NOT NULL AND e."userEndDate" IS NULL THEN 10
      WHEN e."userStartDate" IS NOT NULL AND e."userEndDate" IS NOT NULL THEN 20
      WHEN e."userStartDate" IS NULL AND e."userEndDate" IS NULL THEN 30
      ELSE 30
    END
  `;

    const safeSortMap: Record<string, string> = {
      createdAt: 'e."createdAt"',
      userStartDate: 'e."userStartDate"',
      userEndDate: 'e."userEndDate"',
      startDate: 'e."startDate"',
      endDate: 'e."endDate"',
      email: 'e.email',
      firstname: 'e.firstname',
      lastname: 'e.lastname',
      code: 'e.code',
      visible: 'e.visible',
      assessmentName: 'a.name',
      buyerOrganizationName: 'b."organizationName"',
      examstatus: examStatusCase,
    };

    const orderBy = safeSortMap[sortBy] || 'e."createdAt"';

    const query = this.db
      .createQueryBuilder('e')
      .select([
        'e.*',
        `a.id AS "assessmentId"`,
        `a.name AS "assessmentName"`,

        `b.id AS "buyerUserId"`,
        `b."organizationName" AS "buyerOrganizationName"`,
        `b.firstname AS "buyerFirstName"`,
        `b.lastname AS "buyerLastName"`,

        `${examStatusCase} AS "examstatus"`,

        `
      CASE
        WHEN b."organizationName" IS NOT NULL
          AND TRIM(b."organizationName") <> ''
        THEN true
        ELSE false
      END AS "isInvited"
      `,

        `
      CASE
        WHEN b."organizationName" IS NOT NULL
          AND TRIM(b."organizationName") <> ''
        THEN e.firstname
        ELSE NULL
      END AS "invitedFirstName"
      `,

        `
      CASE
        WHEN b."organizationName" IS NOT NULL
          AND TRIM(b."organizationName") <> ''
        THEN e.lastname
        ELSE NULL
      END AS "invitedLastName"
      `,

        `r.point AS "point"`,
        `r.result AS "result"`,
        `r.value AS "value"`,
        `r.segment AS "segment"`,
      ])
      .leftJoin('assessment', 'a', 'a.id = e."assessmentId"')
      .leftJoin('userService', 'us', 'us.id = e."serviceId"')
      .leftJoin('users', 'b', 'b.id = us."userId"')
      .leftJoin('result', 'r', 'r.code = e.code');

    if (filters.assessment) {
      query.andWhere('e."assessmentId" = :assessment', {
        assessment: filters.assessment,
      });
    }

    if (filters.buyer) {
      query.andWhere('b.id = :buyer', {
        buyer: filters.buyer,
      });
    }

    if (filters.email) {
      query.andWhere('LOWER(e.email) LIKE LOWER(:email)', {
        email: `%${filters.email}%`,
      });
    }

    if (filters.examstatus) {
      query.andWhere(`${examStatusCase} = :examstatus`, {
        examstatus: filters.examstatus,
      });
    }

    if (filters.startDate && filters.endDate) {
      query.andWhere('e."createdAt" BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    const total = await query.getCount();

    query
      .orderBy(orderBy, sortDir)
      .limit(l)
      .offset((p - 1) * l);

    const rows = await query.getRawMany();

    const items = rows.map((row) => ({
      ...row,
      assessmentId: row.assessmentId ? +row.assessmentId : null,
      buyerUserId: row.buyerUserId ? +row.buyerUserId : null,
      examstatus: row.examstatus ? +row.examstatus : 30,
      isInvited:
        row.isInvited === true ||
        row.isInvited === 'true' ||
        row.isInvited === 1 ||
        row.isInvited === '1',
      point: row.point ?? null,
      result: row.result ?? null,
      value: row.value ?? null,
      segment: row.segment ?? null,
    }));

    const assessmentsRaw = await this.db
      .createQueryBuilder('e')
      .select('a.id', 'id')
      .addSelect('a.name', 'name')
      .leftJoin('assessment', 'a', 'a.id = e."assessmentId"')
      .where('e."assessmentId" IS NOT NULL')
      .groupBy('a.id')
      .addGroupBy('a.name')
      .orderBy('a.name', 'ASC')
      .getRawMany();

    const assessments = assessmentsRaw.map((a) => ({
      id: +a.id,
      name: a.name,
    }));

    const buyersRaw = await this.db
      .createQueryBuilder('e')
      .select('b.id', 'userId')
      .addSelect('b."organizationName"', 'organizationName')
      .leftJoin('userService', 'us', 'us.id = e."serviceId"')
      .leftJoin('users', 'b', 'b.id = us."userId"')
      .where('b.id IS NOT NULL')
      .andWhere('b."organizationName" IS NOT NULL')
      .andWhere(`TRIM(b."organizationName") <> ''`)
      .groupBy('b.id')
      .addGroupBy('b."organizationName"')
      .orderBy('b."organizationName"', 'ASC')
      .getRawMany();

    const buyers = buyersRaw.map((b) => ({
      userId: +b.userId,
      organizationName: b.organizationName,
    }));

    const countsRaw = await this.db
      .createQueryBuilder('e')
      .select([
        `
    SUM(
      CASE
        WHEN e."createdAt" >= CURRENT_DATE
         AND e."createdAt" < CURRENT_DATE + INTERVAL '1 day'
        THEN 1 ELSE 0
      END
    ) AS "today"
    `,
        `
    SUM(
      CASE
        WHEN e."createdAt" >= CURRENT_DATE - INTERVAL '1 day'
         AND e."createdAt" < CURRENT_DATE
        THEN 1 ELSE 0
      END
    ) AS "yesterday"
    `,
        `
    SUM(
      CASE
        WHEN e."createdAt" >= date_trunc('week', CURRENT_DATE)
         AND e."createdAt" < date_trunc('week', CURRENT_DATE) + INTERVAL '7 day'
        THEN 1 ELSE 0
      END
    ) AS "thisWeek"
    `,
        `
    SUM(
      CASE
        WHEN e."createdAt" >= date_trunc('week', CURRENT_DATE) - INTERVAL '7 day'
         AND e."createdAt" < date_trunc('week', CURRENT_DATE)
        THEN 1 ELSE 0
      END
    ) AS "lastWeek"
    `,
        `
    SUM(
      CASE
        WHEN e."createdAt" >= date_trunc('month', CURRENT_DATE)
         AND e."createdAt" < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
        THEN 1 ELSE 0
      END
    ) AS "thisMonth"
    `,
        `
    SUM(
      CASE
        WHEN e."createdAt" >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
         AND e."createdAt" < date_trunc('month', CURRENT_DATE)
        THEN 1 ELSE 0
      END
    ) AS "lastMonth"
    `,
      ])
      .getRawOne();

    const counts = {
      today: +(countsRaw?.today || 0),
      yesterday: +(countsRaw?.yesterday || 0),
      thisWeek: +(countsRaw?.thisWeek || 0),
      lastWeek: +(countsRaw?.lastWeek || 0),
      thisMonth: +(countsRaw?.thisMonth || 0),
      lastMonth: +(countsRaw?.lastMonth || 0),
    };

    return {
      items,
      total,
      assessments,
      buyers,
      counts,
    };
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['assessment'],
    });
  };

  findByService = async (service: number) => {
    return await this.db.find({
      where: {
        service: {
          id: service,
        },
      },
      relations: ['assessment', 'service'],
    });
  };

  findAllOwners = async (email: string) => {
    const res = await this.db
      .createQueryBuilder('owner')
      .innerJoin('owner.service', 'service')
      .innerJoin('service.user', 'user')
      .select('DISTINCT user.id', 'userId')
      .where('owner.email = :email', { email })
      .andWhere('user.role = :role', { role: Role.organization })
      .getRawMany();
    return res.map((r) => r.userId);
  };

  findByUser = async (id: number[], user: string, assId: number) => {
    return await this.db.find({
      where: {
        assessment: {
          id: assId == 0 ? Not(IsNull()) : assId,
        },
        email: user,
        service: {
          id: id.length == 0 ? Not(IsNull()) : In(id),
        },
      },
      relations: ['assessment', 'service', 'service.user'],
      order: {
        userEndDate: 'desc',
      },
    });
  };
  findByAdmin = async (pg: PaginationDto) => {
    const { assessment, page, limit, email, startDate, endDate } = pg;

    const whereCondition: any = {
      createdAt: Not(IsNull()),
    };

    if (assessment) {
      whereCondition.assessment = {
        id: assessment == 0 ? Not(0) : assessment,
      };
    }

    if (email) {
      whereCondition.email = Raw(
        (alias) => `LOWER(${alias}) LIKE LOWER(:email)`,
        { email: `%${email}%` },
      );
    }

    if (startDate && endDate) {
      whereCondition.createdAt = Between(startDate, endDate);
    }
    return await this.db.findAndCount({
      where: whereCondition,
      take: limit,
      skip: (page - 1) * limit,
      relations: ['assessment', 'service', 'service.user', 'user'],
      order: {
        createdAt: 'DESC',
      },
    });
  };
  findByCode = async (code: string | number) => {
    const res = await this.db.findOne({
      where: {
        code: `${code}`,
      },
      relations: ['assessment', 'service', 'user', 'service.user'],
    });
    return res;
  };

  findByCodeOnly = async (code: string) => {
    const exam = await this.db
      .query(
        `
    SELECT id, visible, "assessmentId" AS assessment
    FROM exam
    WHERE code = $1
    LIMIT 1
    `,
        [String(code)],
      )
      .then((r) => r[0]);

    if (!exam) {
      return null;
    }

    const assessment = await this.db
      .query(
        `
    SELECT id, name
    FROM assessment
    WHERE id = $1
    `,
        [exam.assessment],
      )
      .then((r) => r[0]);

    return {
      ...exam,
      assessment,
    };
  };

  query = async (q: string) => {
    return await this.db.query(q);
  };

  // findQuartile = async (assessment: number, r: number) => {
  //   const res = await this.db.find({
  //     where: {
  //       assessment: {
  //         id: assessment,
  //       },
  //       result: Not(IsNull()),
  //     },
  //     select: {
  //       result: true,
  //     },
  //     order: {
  //       result: 'ASC', // Sort results in ascending order
  //     },
  //   });

  //   return res.map((r) => parseFloat(r.result));
  // };
}
