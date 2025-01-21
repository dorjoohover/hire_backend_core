import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { CreateExamDto } from '../dto/create-exam.dto';

@Injectable()
export class ExamDao {
  private db: Repository<ExamEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ExamEntity);
  }

  create = async (dto: CreateExamDto) => {
    console.log(dto);
    const res = this.db.create({
      ...dto,
      service: {
        id: dto.service,
      },
      assessmentName: dto.assessment.name,
      assessment: { id: dto.assessment.id },
    });
    await this.db.save(res);
    return res.id;
  };

  update = async (id: number, dto: any) => {
    const res = await this.db.save({ id: id, ...dto });
  };

  updateByCode = async (
    code: number,
    dto: { email: string; lastname: string; firstname: string; phone: string },
  ) => {
    const { email, lastname, firstname, phone } = dto;
    const res = await this.db.findOne({ where: { code: code } });
    await this.db.save({ ...res, email, lastname, firstname, phone });
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
