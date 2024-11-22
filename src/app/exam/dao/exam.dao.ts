import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamEntity } from '../entities/exam.entity';
import { CreateExamDto } from '../dto/create-exam.dto';

@Injectable()
export class ExamDao {
  private db: Repository<ExamEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ExamEntity);
  }

  create = async (dto: CreateExamDto) => {
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
