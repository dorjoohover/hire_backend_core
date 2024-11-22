import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { QuestionAnswerCategoryEntity } from '../entities/question.answer.category.entity';
import { CreateQuestionAnswerCategoryDto } from '../dto/create-question.answer.category.dto';

@Injectable()
export class QuestionAnswerCategoryDao {
  private db: Repository<QuestionAnswerCategoryEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionAnswerCategoryEntity);
  }

  create = async (dto: CreateQuestionAnswerCategoryDto) => {
    const res = this.db.create({
      ...dto,
      parent: dto.parent ? { id: dto.parent } : null,
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
