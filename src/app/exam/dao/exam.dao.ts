import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { AdminExamDto, CreateExamDto } from '../dto/create-exam.dto';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';
import { AssessmentDao } from 'src/app/assessment/dao/assessment.dao';

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
    });
    await this.db.save(res);
    return res.id;
  };

  update = async (code: number, dto: any) => {
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, ...dto });
  };

  updateDate = async (code: number, dto: UpdateDateDto) => {
    await this.db.update(
      { code },
      {
        // startDate: dto.startDate,
        endDate: dto.endDate,
      },
    );
  };

  updateByCode = async (
    code: number,
    dto: { email: string; lastname: string; firstname: string; phone: string },
  ) => {
    const { email, lastname, firstname, phone } = dto;
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, email, lastname, firstname, phone });
  };

  endExam = async (code: number) => {
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
      relations: ['assessment'],
    });
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
    });
  };
  findByAdmin = async (dto: AdminExamDto, page: number, limit: number) => {
    const whereCondition: any = {
      assessment: {
        id: dto.assessment == 0 ? Not(0) : dto.assessment,
      },
      createdAt:
        dto.endDate && dto.startDate
          ? Between(dto.startDate, dto.endDate)
          : Not(IsNull()),
    };

    // Only add email condition if dto.email exists
    if (dto.email) {
      whereCondition.email = Like(`%${dto.email}%`);
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
  findByCode = async (code: number) => {
    const res = await this.db.findOne({
      where: {
        code: code,
      },
      relations: ['assessment', 'service', 'user', 'service.user'],
    });
    return res;
  };

  findByCodeOnly = async (code: number) => {
    const q = `SELECT id, visible, "assessmentId" AS assessment
    FROM exam
    WHERE code = ${code}
    LIMIT 1;`;
    const res = await this.db.query(q).then((d) => d[0]);

    const query = `select id, name from "assessment" where id = ${res.assessment}`;
    const assessment = await this.assessmentDao.query(query);
    console.log(assessment)
    return {
      ...res,
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
