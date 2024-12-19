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
    return res.id;
  };

  updateOne = async (id: number, dto: CreateQuestionAnswerMatrixDto) => {
    await this.db.update(id, {
      ...dto,
      category: {
        id: dto.category as number,
      },
      question: {
        id: dto.question,
      },
      answer: {
        id: dto.answer,
      },
    });
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

  findByAnswer = async (id: number) => {
    return await this.db.find({
      where: {
        answer: {
          id: id,
        },
      },
      order: {
        orderNumber: 'ASC',
      },
    });
  };

  clear = async () => {
    const res = await this.db.createQueryBuilder().delete().execute();
    return res;
  };
}
