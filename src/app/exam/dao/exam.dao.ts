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
