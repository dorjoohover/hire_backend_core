import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateQuestionAnswerDto } from '../dto/create-question.answer.dto';
import { QuestionAnswerEntity } from '../entities/question.answer.entity';
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
      parent: dto.parent
        ? {
            id: dto.parent,
          }
        : null,
    });
    await this.db.save(res);
    return res.id;
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
