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
    const res = this.db.create(dto);
    await this.db.save(res);
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
      //   relations: ['level'],
    });
  };
}
