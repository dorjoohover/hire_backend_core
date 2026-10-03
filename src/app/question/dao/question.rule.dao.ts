import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { QuestionRuleEntity } from '../entities/question.rule.entity';

@Injectable()
export class QuestionRuleDao {
  private db: Repository<QuestionRuleEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionRuleEntity);
  }

  // Тухайн асуултуудад (target) хамаарах идэвхтэй дүрмүүдийг ганц query-ээр.
  findByTargetQuestionIds = async (
    ids: number[],
  ): Promise<QuestionRuleEntity[]> => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT id,
              "targetQuestionId"   AS "targetQuestionId",
              "dependsOnQuestionId" AS "dependsOnQuestionId",
              "dependsOnAnswerId"  AS "dependsOnAnswerId",
              "dependsOnMatrixId"  AS "dependsOnMatrixId",
              "targetAnswerId"     AS "targetAnswerId",
              action,
              active
       FROM "questionRule"
       WHERE active = true AND "targetQuestionId" = ANY($1)`,
      [ids],
    );
  };

  create = async (dto: Partial<QuestionRuleEntity>) => {
    const res = this.db.create(dto);
    await this.db.save(res);
    return res.id;
  };

  findAll = async () => {
    return await this.db.find({ order: { id: 'ASC' } });
  };

  findByTargetQuestion = async (id: number) => {
    return await this.db.find({
      where: { targetQuestionId: id },
      order: { id: 'ASC' },
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({ where: { id } });
  };

  updateOne = async (id: number, patch: Partial<QuestionRuleEntity>) => {
    await this.db.update(id, patch);
  };

  // Дүрмийн шалгалтад: асуулт бүрийн төрөл, блок (order), тест.
  findQuestionMeta = async (ids: number[]) => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT q.id, q.type,
              q."categoryId" AS "categoryId",
              c."orderNumber" AS "categoryOrder",
              c."assessmentId" AS "assessmentId"
       FROM question q
       LEFT JOIN "questionCategory" c ON c.id = q."categoryId"
       WHERE q.id = ANY($1)`,
      [ids],
    );
  };

  // Хариулт аль асуултынх вэ (dependsOnAnswerId нь нөхцөл асуултынх эсэхийг шалгахад).
  findAnswerQuestionId = async (answerId: number): Promise<number | null> => {
    const rows = await this.db.query(
      `SELECT "questionId" FROM "questionAnswer" WHERE id = $1`,
      [answerId],
    );
    return rows.length ? Number(rows[0].questionId) : null;
  };

  // MATRIX нүд аль асуулт / мөрийнх вэ (dependsOnMatrixId-г шалгахад).
  findMatrixOwner = async (
    matrixId: number,
  ): Promise<{ questionId: number | null; answerId: number | null } | null> => {
    const rows = await this.db.query(
      `SELECT "questionId", "answerId" FROM "questionAnswerMatrix" WHERE id = $1`,
      [matrixId],
    );
    if (!rows.length) return null;
    const n = (v: any) => (v == null ? null : Number(v));
    return { questionId: n(rows[0].questionId), answerId: n(rows[0].answerId) };
  };

  deleteOne = async (id: number) => {
    return await this.db.delete(id);
  };
}
