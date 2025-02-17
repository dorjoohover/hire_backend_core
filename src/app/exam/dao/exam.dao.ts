import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';

@Injectable()
export class ExamDao {
  private db: Repository<ExamEntity>;
  constructor(private dataSource: DataSource) {
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

  updateDate = async (id: number, dto: UpdateDateDto) => {
    await this.db.update(id, {
      startDate: dto.startDate,
      endDate: dto.endDate,
    });
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

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
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
    });
  };

  findByUser = async (id: number[], user: number) => {
    return await this.db.find({
      where: {
        service: {
          id: In(id),
          user: {
            id: user,
          },
        },
      },
      relations: ['assessment'],
    });
  };
  findByCode = async (code: number) => {
    const res = await this.db.findOne({
      where: {
        code: code,
      },
      relations: ['assessment', 'service'],
    });
    return res;
  };
}
