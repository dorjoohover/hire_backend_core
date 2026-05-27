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

  deleteOne = async (id: number) => {
    return await this.db.delete(id);
  };
}
