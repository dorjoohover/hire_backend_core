import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { QuestionAnswerMatrixEntity } from '../entities/question.answer.matrix.entity';
import { CreateQuestionAnswerMatrixDto } from '../dto/create-question.answer.matrix.dto';

@Injectable()
export class QuestionAnswerMatrixDao {
  private db: Repository<QuestionAnswerMatrixEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionAnswerMatrixEntity);
  }

  create = async (dto: CreateQuestionAnswerMatrixDto) => {
    const res = this.db.create({
      ...dto,
      question: {
        id: dto.question,
      },
      category: {
        id: dto.category as number,
      },
      answer: {
        id: dto.answer,
      },
    });
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

  clear = async () => {
    const res = await this.db.createQueryBuilder().delete().execute();
    return res;
  };
}
