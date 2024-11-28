import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateQuestionTypeDto } from '../dto/create-question.type';
import { QuestionTypeEntity } from '../entities/question.type.entity';

@Injectable()
export class QuestionTypeDao {
  private db: Repository<QuestionTypeEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionTypeEntity);
  }

  create = async (dto: CreateQuestionTypeDto) => {
    const res = this.db.create({
      ...dto,
    });
    await this.db.save(res);
    return res;
  };

  findAll = async () => {
    return await this.db.find({});
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
  findByName = async (name: string) => {
    const res = await this.db.findOne({
      where: {
        name: name,
      },
    });
    return res;
  };
}
