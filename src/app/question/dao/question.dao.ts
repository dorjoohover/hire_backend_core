import { Injectable, Optional } from '@nestjs/common';
import { DefinitionCacheService } from 'src/base/definition-cache/definition-cache.service';
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
  constructor(
    private dataSource: DataSource,
    // v1.3.0: тодорхойлолтын кэш (global). Тестэд (new QuestionDao(ds)) байхгүй → шууд DB.
    @Optional() private defCache?: DefinitionCacheService,
  ) {
    this.db = this.dataSource.getRepository(QuestionEntity);
  }

  private readonly examFields = [
    'entity.id',
    'entity.name',
    'entity.type',
    'entity.level',
    'entity.minValue',
    'entity.maxValue',
    'entity.slider',
    'entity.settings',
    'entity.orderNumber',
    'entity.file',
    'entity.point',
    'entity.required',
  ];

  /** Хэсгийн бүх ИДЭВХТЭЙ асуулт (id-аар) — v1.3.0: admin засах хүртэл кэштэй. */
  private activeByCategory = async (category: number): Promise<any[]> => {
    const load = () =>
      this.db
        .createQueryBuilder('entity')
        .select(this.examFields)
        .where('entity.status = :status AND entity."categoryId" = :category', {
          status: QuestionStatus.ACTIVE,
          category: category,
        })
        .orderBy('entity.id')
        .getMany();
    return this.defCache ? this.defCache.getOrLoad('qcat', category, load) : load();
  };

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
        'entity.settings',
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
      const all = await this.activeByCategory(category);
      const ordered = stableShuffle(all, seed, (q) => q.id);
      return limit !== null && limit !== undefined
        ? ordered.slice(0, limit)
        : ordered;
    }

    // v1.3.0: shuffle-гүй үед ч кэшээс — SQL-ийн "orderNumber ASC NULLS LAST, id ASC" + limit-ийг
    // JS-д яг давтана (TypeORM: limit null/undefined → хязгааргүй, 0 → LIMIT 0).
    if (!shuffle && this.defCache) {
      const all = await this.activeByCategory(category);
      const key = (v: any) => (v == null ? Number.POSITIVE_INFINITY : Number(v));
      const sorted = [...all].sort(
        (a, b) => key(a.orderNumber) - key(b.orderNumber) || Number(a.id) - Number(b.id),
      );
      return limit !== null && limit !== undefined ? sorted.slice(0, Number(limit)) : sorted;
    }

    // Conditionally add limit only if it's not null
    if (limit !== null) {
      query.limit(limit);
    }

    // Add ordering and execute the query. Shuffle-гүй үед admin дээр чирж тогтоосон
    // дараалал (orderNumber) — өмнө нь id-аар (үүсгэсэн дарааллаар) эрэмбэлдэг байсан
    // тул admin-д дарааллыг сольсон ч web-д хуучнаараа гардаг байв.
    if (shuffle) query.orderBy('RANDOM()');
    else query.orderBy('entity.orderNumber', 'ASC', 'NULLS LAST').addOrderBy('entity.id', 'ASC');
    const res = await query.getMany();

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
  ): Promise<
    {
      id: number;
      type: number;
      minValue: number;
      maxValue: number;
      settings: Record<string, any> | null;
      categoryId: number | null;
    }[]
  > => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT id, type, "minValue" AS "minValue", "maxValue" AS "maxValue", settings,
              "categoryId" AS "categoryId"
       FROM question WHERE id = ANY($1)`,
      [ids],
    );
  };

  clear = async () => {
    return await this.db.createQueryBuilder().delete().execute();
  };
}
