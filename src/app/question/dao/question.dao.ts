import { Injectable } from '@nestjs/common';
import { DataSource, DBRef, Repository } from 'typeorm';
import { QuestionEntity } from '../entities/question.entity';
import {
  CreateQuestionAllDto,
  CreateQuestionDto,
} from '../dto/create-question.dto';
import { QuestionStatus } from 'src/base/constants';
import { AssessmentDao } from 'src/app/assessment/dao/assessment.dao';
import { QuestionCategoryDao } from './question.category.dao';
import { stableShuffle } from '../../exam/exam-resume';

@Injectable()
export class QuestionDao {
  private db: Repository<QuestionEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(QuestionEntity);
  }

  create = async (dto: CreateQuestionDto) => {
    const res = this.db.create({
      ...dto,
      category: {
        id: dto.category,
      },
    });
    await this.db.save(res);
    return res;
  };

  countQuestionCategory = async (id: number) => {
    return await this.db.count({
      where: {
        category: {
          id: id,
        },
      },
    });
  };

  findByCategory = async (
    limit: number,
    shuffle: boolean,
    category: number,
    prevQuestions: number[],
    /**
     * №3: seed өгвөл (shuffle=true үед) `RANDOM()`-ын оронд seed-тэй ТОГТВОРТОЙ эрэмбэ + limit.
     * Шалгуулагч дундаас гараад буцаж ороход ижил асуулт, ижил дараалал гарна.
     */
    seed?: string,
  ) => {
    const query = this.db
      .createQueryBuilder('entity')
      .select([
        'entity.id',
        'entity.name',
        'entity.type',
        'entity.level',
        'entity.minValue',
        'entity.maxValue',
        'entity.slider',
        'entity.orderNumber',
        'entity.file',
        'entity.point',
        'entity.required',
      ])
      .where('entity.status = :status AND entity."categoryId" = :category', {
        status: QuestionStatus.ACTIVE,
        category: category,
      });

    // Conditionally exclude IDs if prevQuestions is not empty
    // if (prevQuestions.length > 0) {
    //   query.andWhere('entity."id" NOT IN (:...prevQuestions)', {
    //     prevQuestions,
    //   });
    // }

    // Тогтвортой shuffle: бүх идэвхтэй асуултыг id-аар авч (нэг хэсэгт ~10–100 мөр), JS-д seed-ээр
    // эрэмбэлээд limit-ийг хэрэглэнэ.
    if (shuffle && seed) {
      const all = await query.orderBy('entity.id').getMany();
      const ordered = stableShuffle(all, seed, (q) => q.id);
      return limit !== null && limit !== undefined
        ? ordered.slice(0, limit)
        : ordered;
    }

    // Conditionally add limit only if it's not null
    if (limit !== null) {
      query.limit(limit);
    }

    // Add ordering and execute the query
    const res = await query
      .orderBy(shuffle ? 'RANDOM()' : 'entity.id')
      .getMany();

    return res;
  };

  findAll = async () => {
    return await this.db.find({
      relations: ['answers', 'matrix'],
    });
  };

  findQuestions = async (id: number) => {
    return await this.db.find({
      where: {
        category: {
          id: id,
        },
      },
      relations: ['answers', 'matrix', 'answers.category', 'answers.matrix'],
    });
  };

  updateOne = async (dto: CreateQuestionDto, id: number, user: number) => {
    const { ...d } = dto;
    const res = await this.db.findOne({
      where: { id: id },
    });
    const body = {
      ...d,
      category: {
        id: dto.category,
      },
    };

    await this.db.save({ ...res, ...body, updatedUser: user });
    return {
      id: res.id,
      point: dto.point - res.point,
    };
  };

  deleteOne = async (id: number) => {
    await this.db.createQueryBuilder().delete().where({ id: id }).execute();
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['matrix', 'answers', 'category'],
    });
  };

  query = async (q?: string) => {
    let query = q ?? `select * from question where id = ${q}`;
    return await this.db.query(query);
  };

  // Олон асуултын min/max-ийг ганц query-ээр (batch preload).
  findMinMaxByIds = async (
    ids: number[],
  ): Promise<{ id: number; minValue: number; maxValue: number }[]> => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT id, "minValue" AS "minValue", "maxValue" AS "maxValue"
       FROM question WHERE id = ANY($1)`,
      [ids],
    );
  };

  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
