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
      category: dto.category
        ? {
            id: dto.category as number,
          }
        : null,
      question: {
        id: dto.question,
      },
    });
    await this.db.save(res);
    return res.id;
  };

  updateOne = async (id: number, dto: CreateQuestionAnswerDto) => {
    const res = await this.db.findOne({
      where: { id },
    });
    const { ...d } = dto;
    const body = {
      ...d,
      category: {
        id: dto.category as number,
      },
      question: {
        id: dto.question,
      },
    };

    await this.db.save({ ...res, ...body });
    // await this.db.save({ ...res, ...body, updatedUser: user });
    return res.id;
  };

  findByQuestion = async (id: number, shuffle: boolean) => {
    const res = await this.db.find({
      select: {
        point: false,
        correct: false,
      },
      where: {
        question: { id: id },
      },
      order: {
        orderNumber: 'ASC',
      },
      relations: ['matrix', 'category'],
    });
    if (res?.[0]?.matrix)
      return res.map((result) => {
        const { point, correct, ...res } = result;
        return {
          ...res,
          matrix: shuffle
            ? this.shuffle(result.matrix)
            : result.matrix.sort((a, b) => a.orderNumber - b.orderNumber),
        };
      });
    return shuffle ? this.shuffle(res) : res;
  };

  shuffle = (list: any[]) => {
    return list
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  };
  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['category'],
    });
  };
  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
