import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateQuestionAnswerDto } from '../dto/create-question.answer.dto';
import { QuestionAnswerEntity } from '../entities/question.answer.entity';

@Injectable()
export class QuestionAnswerDao {
  private db: Repository<QuestionAnswerEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionAnswerEntity);
  }

  create = async (dto: CreateQuestionAnswerDto) => {
    const res = this.db.create({
      ...dto,
      category: {
        id: dto.category,
      },
      question: {
        id: dto.question,
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
