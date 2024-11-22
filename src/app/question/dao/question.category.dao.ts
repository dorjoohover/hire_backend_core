import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { QuestionCategoryEntity } from '../entities/question.category.entity';
import { CreateQuestionCategoryDto } from '../dto/create-question.category.dto';
import { UpdateQuestionCategoryDto } from '../dto/create-question.dto';

@Injectable()
export class QuestionCategoryDao {
  private db: Repository<QuestionCategoryEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionCategoryEntity);
  }

  create = async (dto: CreateQuestionCategoryDto) => {
    const res = this.db.create({
      ...dto,
      assessment: {
        id: dto.assessment,
      },
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
