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

  deleteOne = async (id: number) => {
    return await this.db.delete(id);
  };

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
      where: { id: id },
      relations: ['category'],
    });

    const update =
      res.value == dto.value &&
      res.point == dto.point &&
      dto.correct == res.correct &&
      res.orderNumber == dto.orderNumber &&
      res.file == dto.file &&
      dto.category == res.category?.id;
    if (update) return id;

    await this.db.update(id, {
      ...dto,
      category: {
        id: dto.category as number,
      },
      question: {
        id: dto.question as number,
      },
    });

    return id;
  };

  findByQuestion = async (id: number, shuffle: boolean, admin: boolean) => {
    const res = await this.db.find({
      select: {
        point: true,
        correct: true,
        id: true,
        value: true,
        orderNumber: true,
        file: true,
      },
      where: {
        question: { id: id },
      },
      order: {
        orderNumber: 'ASC',
      },
      relations: ['matrix', 'matrix.category', 'category'],
    });
    if (res?.[0]?.matrix)
      return res.map((result) => {
        const { point, correct, ...res } = result;
        return admin
          ? {
              ...res,
              point: point,
              correct: correct,
              matrix: shuffle
                ? this.shuffle(result.matrix)
                : result.matrix.sort((a, b) => a.orderNumber - b.orderNumber),
            }
          : {
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
