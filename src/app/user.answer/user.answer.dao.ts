import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserAnswerEntity } from './entities/user.answer.entity';
import { CreateUserAnswerDto } from './dto/create-user.answer.dto';
import { ReportType } from 'src/base/constants';

@Injectable()
export class UserAnswerDao {
  private db: Repository<UserAnswerEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(UserAnswerEntity);
  }
  query = async (q: string, params: any[] = []) => {
    return await this.db.query(q, params);
  };
  create = async (dto: CreateUserAnswerDto) => {
    try {
      let res = dto.matrix
        ? await this.db.findOne({
            where: {
              question: { id: dto.question },
              code: dto.code,
              matrix: {
                id: dto.matrix,
              },
            },
            relations: ['answer'],
          })
        : await this.db.findOne({
            where: {
              question: { id: dto.question },
              code: dto.code,
              answer: {
                id: dto.answer,
              },
            },
          });
      const body = {
        ...dto,
        exam: { id: +dto.exam },
        endDate: new Date(),
        answer: { id: dto.answer ? dto.answer : null },

        matrix: dto.matrix ? { id: +dto.matrix } : null,
        question: { id: +dto.question },
        answerCategory: dto.answerCategory ? { id: +dto.answerCategory } : null,
        questionCategory: { id: +dto.questionCategory },
      };
      if (res) {
        const point: number = (() => {
          const p = Number(dto.point);
          return isNaN(p) ? 0 : p;
        })();
        console.log(body.question, point)
        await this.db.save({ ...res, point });
      } else {
        res = this.db.create(body);
        await this.db.save(res);
      }
      return res.id;
    } catch (error) {
      console.log('err', error);
      return undefined;
    }
  };

  partialCalculator = async (
    id: number,
    type: number,
  ): Promise<
    {
      categoryName: string;
      point: number;
      totalPoint: number;
    }[]
  > => {
    const res = this.db
      .createQueryBuilder('userAnswer')
      .select('category.name', 'categoryName')
      .addSelect('category.totalPoint', 'totalPoint')
      .addSelect(
        `${type === ReportType.CORRECTCOUNT ? 'COUNT' : 'SUM'}(userAnswer.point)`,
        'point',
      )
      .innerJoin(
        'questionCategory',
        'category',
        'category.id = "userAnswer"."questionCategoryId"',
      )
      .where('"userAnswer"."code" = :id', { id });

    if (type === ReportType.CORRECTCOUNT) {
      res.andWhere('"userAnswer"."correct" = true');
    }

    return await res
      .groupBy('category.name')
      .addGroupBy('category.totalPoint')
      .getRawMany();
  };

  // Нэг тестийн (code) хувьд хариулт бүртгэгдсэн questionCategory-ийн id-уудыг
  // ганц query-ээр буцаана. updateByCode доторх category тус бүрийн давталтыг
  // (N round-trip) орлоно.
  findAnsweredCategoryIds = async (code: string): Promise<number[]> => {
    const rows = await this.db
      .createQueryBuilder('ua')
      .select('DISTINCT ua."questionCategoryId"', 'id')
      .where('ua.code = :code', { code })
      .andWhere('ua."questionCategoryId" IS NOT NULL')
      .getRawMany();
    return rows.map((r) => Number(r.id));
  };

  // Нэг тестийн бүх бүртгэгдсэн хариултыг dedup хийхэд хэрэгтэй талбаруудтай нь
  // ганц query-ээр татна (өмнө нь хариулт бүрд findByAnswerId/findByAnswerMatrixId
  // гэж тус тусад нь дуудаж байсныг орлоно).
  findExistingByCode = async (
    code: string,
  ): Promise<
    {
      id: number;
      questionId: number;
      answerId: number | null;
      matrixId: number | null;
    }[]
  > => {
    return await this.db.query(
      `SELECT id,
              "questionId"         AS "questionId",
              "answerId"           AS "answerId",
              "matrixId"           AS "matrixId"
       FROM "userAnswer"
       WHERE code = $1`,
      [String(code)],
    );
  };

  // Шинэ хариултуудыг нэг transaction дотор багцаар хадгална
  // (өмнө нь хариулт бүрд тусдаа findOne + save хийдэг байсан).
  bulkInsert = async (bodies: CreateUserAnswerDto[]): Promise<number[]> => {
    if (!bodies.length) return [];
    const now = new Date();
    const rows = bodies.map((dto) => {
      // Postgres numeric багана Infinity/NaN-ыг 'Infinity'/'NaN' хэлбэрээр
      // хадгалдаг тул шууд null болгож цэвэрлэнэ.
      let safePoint: number | null = null;
      if (dto.point !== null && dto.point !== undefined) {
        const n = Number(dto.point);
        safePoint = Number.isFinite(n) ? n : null;
      }
      return {
      ip: dto.ip,
      device: dto.device,
      value: dto.value,
      correct: dto.correct,
      flag: dto.flag,
      point: safePoint,
      code: dto.code,
      startDate: dto.startDate,
      endDate: now,
      exam: { id: +dto.exam },
      answer: Number(dto.answer) > 0 ? { id: Number(dto.answer) } : null,
      matrix: Number(dto.matrix) > 0 ? { id: Number(dto.matrix) } : null,
      question: { id: +dto.question },
      answerCategory: dto.answerCategory ? { id: +dto.answerCategory } : null,
      questionCategory: { id: +dto.questionCategory },
      };
    });
    return await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(UserAnswerEntity, rows as any);
      return (saved as UserAnswerEntity[]).map((s) => s.id);
    });
  };

  // Дахин хариулсан хэрэглэгч өмнөх сонголтуудаа сольсон үед хуучин мөрүүдийг
  // нэг query-ээр устгана.
  deleteByIds = async (ids: number[]): Promise<void> => {
    if (!ids.length) return;
    await this.db.query(`DELETE FROM "userAnswer" WHERE id = ANY($1)`, [ids]);
  };

  // Дахин хариулсан мөрүүдийг нэг transaction дотор шинэчилнэ. Текст хариултын
  // value солих үед энэ функц нь зөвхөн point биш value/correct/flag-ийг ч
  // шинэчилдэг тул хэрэглэгчийн өөрчлөлт DB-д хүрнэ. undefined талбаруудыг
  // TypeORM update SET-аас алгасах тул хуучин утга хадгалагдана.
  bulkUpdatePoints = async (
    updates: {
      id: number;
      point: number;
      value?: string;
      correct?: boolean;
      flag?: boolean;
      ip?: string;
      device?: string;
    }[],
  ): Promise<void> => {
    if (!updates.length) return;
    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      for (const u of updates) {
        const n = Number(u.point);
        const safe = Number.isFinite(n) ? n : 0;
        const patch: Partial<UserAnswerEntity> = {
          point: safe,
          endDate: now,
        };
        if (u.value !== undefined) patch.value = u.value;
        if (u.correct !== undefined) patch.correct = u.correct;
        if (u.flag !== undefined) patch.flag = u.flag;
        if (u.ip !== undefined) patch.ip = u.ip;
        if (u.device !== undefined) patch.device = u.device;
        await manager.update(UserAnswerEntity, { id: u.id }, patch);
      }
    });
  };

  // ---- Studio (pdf builder) / report-ийн зориулалт ----
  // Тухайн code-ын хариултуудыг category-аар бүлэглэж, дотроо question.orderNumber
  // дарааллаар буцаана. Front-end placeholder бүрд тус тусдаа дуудалт явуулахгүй,
  // нэг round-trip-ээр бүх report-д хэрэгтэй дата.
  getAnswerAll = async (code: string) => {
    return await this.db.query(
      `SELECT ua."questionCategoryId"            AS "questionCategoryId",
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'questionId',   ua."questionId",
                  'questionName', q.name,
                  'orderNumber',  q."orderNumber",
                  'value',        ua.value,
                  'point',        ua.point,
                  'answerValue',  qa.value,
                  'matrixValue',  qm.value
                )
                ORDER BY q."orderNumber" ASC, ua.id ASC
              ) AS answers
       FROM "userAnswer" ua
       JOIN question q                  ON q.id = ua."questionId"
       LEFT JOIN "questionAnswer" qa    ON qa.id = ua."answerId"
       LEFT JOIN "questionAnswerMatrix" qm ON qm.id = ua."matrixId"
       WHERE ua.code = $1
       GROUP BY ua."questionCategoryId"
       ORDER BY ua."questionCategoryId" ASC`,
      [code],
    );
  };

  // Studio placeholder {category:42} → тухайн category-ийн хариулт жагсаалт.
  // categoryId-ыг string-ээр хүлээж авна (URL param) — Postgres int багана руу
  // parameterized query-ийн дотор coerce хийгдэнэ.
  getAnswersByCategory = async (code: string, categoryId: string) => {
    return await this.db.query(
      `SELECT ua."questionId"     AS "questionId",
              q.name               AS "questionName",
              q."orderNumber"      AS "orderNumber",
              ua.value             AS value,
              ua.point             AS point,
              qa.value             AS "answerValue",
              qm.value             AS "matrixValue"
       FROM "userAnswer" ua
       JOIN question q                  ON q.id = ua."questionId"
       LEFT JOIN "questionAnswer" qa    ON qa.id = ua."answerId"
       LEFT JOIN "questionAnswerMatrix" qm ON qm.id = ua."matrixId"
       WHERE ua.code = $1 AND ua."questionCategoryId" = $2
       ORDER BY q."orderNumber" ASC, ua.id ASC`,
      [code, categoryId],
    );
  };

  // Studio placeholder {question:1879} → тухайн нэг асуултын хариулт(ууд)
  getAnswerByQuestion = async (code: string, questionId: string) => {
    return await this.db.query(
      `SELECT ua."questionId" AS "questionId",
              ua.value         AS value,
              ua.point         AS point,
              qa.value         AS "answerValue",
              qm.value         AS "matrixValue"
       FROM "userAnswer" ua
       LEFT JOIN "questionAnswer" qa    ON qa.id = ua."answerId"
       LEFT JOIN "questionAnswerMatrix" qm ON qm.id = ua."matrixId"
       WHERE ua.code = $1 AND ua."questionId" = $2
       ORDER BY ua.id ASC`,
      [code, questionId],
    );
  };

  findAll = async () => {
    return await this.db.find({});
  };

  findByCode = async (code: string, id?: number) => {
    if (id != 0 && id) {
      return await this.db.find({
        where: {
          code: code,
          questionCategory: {
            id: id,
          },
        },
        relations: ['question', 'answer', 'matrix'],
      });
    }
    return await this.db.find({
      where: {
        code: code,
      },
      relations: ['question', 'answer', 'matrix', 'questionCategory'],
      order: {
        questionCategory: {
          id: 'ASC',
        },
      },
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
    });
  };
  findByAnswerId = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        answer: {
          id,
        },
        code,
      },
    });
  };
  findByAnswerMatrixId = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        code: code,
        matrix: {
          id,
        },
      },
    });
  };
  findByQuestionCategory = async (id: number, code: string) => {
    return await this.db.findOne({
      where: {
        questionCategory: {
          id,
        },
        code,
      },
    });
  };
  findByExam = async (exam: number) => {
    return await this.db.find({
      where: {
        exam: {
          id: exam,
        },
      },
    });
  };

  updateOne = async (id: number, dto: CreateUserAnswerDto) => {
    let res = await this.findOne(id);

    res = await this.db.save({
      id: res.id,
      answer: { id: dto.answer },
      matrix: { id: dto.matrix },
      flag: dto.flag,
      device: dto.device,
      ip: dto.ip,
      point: dto.point,
    });
    return res.id;
  };

  // dynamic = async () => {
  //   await this.db.createQueryBuilder('', {

  //   }).addGroupBy()
  // }

  deleteOne = async (id: number) => {
    return await this.db
      .createQueryBuilder()
      .where({
        id: id,
      })
      .delete()
      .execute();
  };
}
