import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamDetailEntity } from '../entities/exam.detail.entity';
import { CreateExamDetailDto } from '../dto/create-exam.detail.dto';

@Injectable()
export class ExamDetailDao {
  private db: Repository<ExamDetailEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ExamDetailEntity);
  }

  create = async (dto: CreateExamDetailDto) => {
    const res = this.db.create({
      ...dto,
      exam: { id: dto.exam },
      question: { id: dto.question },
      questionCategory: { id: dto.questionCategory },
      service: { id: dto.service },
    });
    await this.db.save(res);
  };

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };
  findByExam = async (exam: number) => {
    return await this.db.find({
      where: {
        exam: {
          id: exam,
        },
      },
      order: {
        id: 'ASC',
      },
    });
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
