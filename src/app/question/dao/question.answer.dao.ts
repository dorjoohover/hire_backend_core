import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CreateQuestionAnswerDto } from '../dto/create-question.answer.dto';
import { QuestionAnswerEntity } from '../entities/question.answer.entity';
import { QuestionType } from 'src/base/constants';
import { QuestionAnswerViewService } from '../question-answer-view.service';

@Injectable()
export class QuestionAnswerDao {
  private db: Repository<QuestionAnswerEntity>;
  constructor(
    private dataSource: DataSource,
    private viewService: QuestionAnswerViewService,
  ) {
    this.db = this.dataSource.getRepository(QuestionAnswerEntity);
  }

  deleteOne = async (id: number) => {
    const res = await this.db.delete(id);
    this.viewService.refresh();
    return res;
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
    this.viewService.refresh();
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
        dto.category == res.category?.id &&
        dto.reverse == res.reverse &&
        dto.negative == res.negative;
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

      this.viewService.refresh();
      return id;
    } catch (error) {
      console.log(error);
    }
  };

  findByQuestionId = async (id: number) => {
    const res = await this.db.find({
      where: {
        question: {
          id: id,
        },
      },
    });
    return res;
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
        reverse: true,
        negative: true,
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

  // Batched replacement for findByQuestion(): fetches answers (+ matrix +
  // categories) for many questions in ONE query via mv_question_answer_full,
  // instead of one join-heavy query per question. Returns a Map keyed by
  // questionId, value shaped exactly like findByQuestion's return value.
  findByQuestionIds = async (
    questionIds: number[],
    shuffle: boolean,
    admin: boolean,
  ): Promise<Map<number, any[]>> => {
    const result = new Map<number, any[]>();
    if (!questionIds?.length) return result;

    const rows: any[] = await this.db.query(
      `SELECT * FROM mv_question_answer_full
       WHERE "questionId" = ANY($1)
       ORDER BY "questionId", "orderNumber" ASC, id, "matrixOrderNumber" ASC NULLS LAST`,
      [questionIds],
    );

    const answers = new Map<number, any>();
    const order = new Map<number, number[]>();

    for (const r of rows) {
      if (!answers.has(r.id)) {
        answers.set(r.id, {
          id: r.id,
          value: r.value,
          point: r.point == null ? null : Number(r.point),
          orderNumber: r.orderNumber,
          file: r.file,
          correct: r.correct,
          reverse: r.reverse,
          negative: r.negative,
          category: r.categoryId
            ? {
                id: r.categoryId,
                name: r.categoryName,
                description: r.categoryDescription,
              }
            : null,
          matrix: [] as any[],
        });
        const arr = order.get(r.questionId) ?? [];
        arr.push(r.id);
        order.set(r.questionId, arr);
      }
      if (r.matrixId != null) {
        answers.get(r.id).matrix.push({
          id: r.matrixId,
          value: r.matrixValue,
          point: r.matrixPoint == null ? null : Number(r.matrixPoint),
          orderNumber: r.matrixOrderNumber,
          category: r.matrixCategoryId
            ? { id: r.matrixCategoryId, name: r.matrixCategoryName }
            : null,
        });
      }
    }

    for (const [questionId, answerIds] of order) {
      const list = answerIds.map((id) => answers.get(id));
      let out: any[];
      if (list[0]?.matrix?.length > 0) {
        out = [];
        for (const r of list) {
          const { point, correct, ...body } = r;
          const sortedMatrix = r.matrix.sort(
            (a: any, b: any) => a.orderNumber - b.orderNumber,
          );
          const matrixOut = shuffle
            ? await this.shuffle(sortedMatrix)
            : sortedMatrix;
          out.push(
            admin
              ? { ...body, point, correct, matrix: matrixOut }
              : { ...body, matrix: matrixOut },
          );
        }
      } else {
        out = !shuffle
          ? list.sort((a, b) => a.orderNumber - b.orderNumber)
          : await this.shuffle(list);
      }
      result.set(questionId, out);
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
      relations: ['category', 'question'],
    });
  };

  findOneOnly = async (id: number) => {
    return await this.db.findOne({
      where: { id },
    });
  };

  query = async (q: string) => {
    return await this.db.query(q);
  };

  // Олон хариултын оноо тооцоход хэрэгтэй мета мэдээллийг ганц query-ээр.
  findMetaByIds = async (
    ids: number[],
  ): Promise<
    {
      id: number;
      reverse: boolean;
      negative: boolean;
      correct: boolean;
      categoryId: number | null;
      point: number | null;
    }[]
  > => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT id, reverse, negative, correct, "categoryId" AS "categoryId", point
       FROM "questionAnswer" WHERE id = ANY($1)`,
      [ids],
    );
  };

  clear = async () => {
    const res = await this.db.createQueryBuilder().delete().execute();
    this.viewService.refresh();
    return res;
  };
}
