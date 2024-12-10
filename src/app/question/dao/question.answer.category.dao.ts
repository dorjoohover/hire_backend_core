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
      assessment: dto.assessment ? { id: dto.assessment } : null,
    });
    await this.db.save(res);
    return {
      name: res.name,
      id: res.id,
    };
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
    });
  };
  findByName = async (name: string) => {
    const res = await this.db.findOne({
      where: {
        name: name,
      },
    });
    return {
      id: res?.id,
      name: res?.name,
    };
  };
  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
