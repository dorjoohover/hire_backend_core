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
    try {
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
    } catch (error) {
      console.log(error);
    }
  };

  findByQuestion = async (id: number, shuffle: boolean, admin: boolean) => {
    let result = [];
    let res = await this.db.find({
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
    if (res?.[0]?.matrix?.length > 0)
      for (const r of res) {
        const { point, correct, ...body } = r;
        result.push(
          admin
            ? {
                ...body,
                point: point,
                correct: correct,
                matrix: shuffle
                  ? await this.shuffle(body.matrix)
                  : body.matrix.sort((a, b) => a.orderNumber - b.orderNumber),
                // : body.matrix,
              }
            : {
                ...body,
                matrix: shuffle
                  ? await this.shuffle(body.matrix)
                  : body.matrix.sort((a, b) => a.orderNumber - b.orderNumber),
                // : body.matrix,
              },
        );
      }
    else {
      result = !shuffle
        ? res.sort((a, b) => a.orderNumber - b.orderNumber)
        : await this.shuffle(res);
    }

    return result;
  };

  shuffle = async (list: any[]) => {
    return await Promise.all(
      list
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value),
    );
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
