import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  Not,
  Raw,
  Repository,
} from 'typeorm';
import { AssessmentEntity } from '../entities/assessment.entity';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { QuestionDao } from 'src/app/question/dao/question.dao';
import { Meta } from 'src/base/base.interface';
import { AssessmentStatus } from 'src/base/constants';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class AssessmentDao {
  private db: Repository<AssessmentEntity>;
  constructor(
    private dataSource: DataSource,
    private question: QuestionDao,
  ) {
    this.db = this.dataSource.getRepository(AssessmentEntity);
  }

  async find(page = 1, limit = 20, sort = true, status = 0): Promise<Meta> {
    const skip = (page - 1) * limit;
    let statusCondition: any;

    if (status > 0) {
      if (status === AssessmentStatus.ONLY) {
        statusCondition = In([]);
      } else {
        statusCondition = status;
      }
    } else {
      statusCondition = Not(AssessmentStatus.ONLY);
    }

    const [items, total] = await this.db.findAndCount({
      where: {
        status: statusCondition,
      },
      skip,

      take: limit,
      order: {
        createdAt: !sort ? 'ASC' : 'DESC',
      },
      relations: ['category'],
    });

    return {
      items,
      total,
      count: Math.ceil(total / limit),
      page,
      limit,
    };
  }

  public count = async () => {
    return await this.db.count({
      where: {
        status: Not(AssessmentStatus.ARCHIVE),
      },
    });
  };
  create = async (dto: CreateAssessmentDto) => {
    const { answerCategories, ...body } = dto;
    const res = this.db.create({
      ...body,
      category: {
        id: dto.category,
      },
      level: dto.level
        ? {
            id: dto.level,
          }
        : null,
    });
    await this.db.save(res);
    return res.id;
  };
  findOrg = async (owners: number[]) => {
    const data = await this.db.find({
      where: {
        owner: {
          id: In(owners),
        },
      },
      relations: ['level', 'category'],
      order: {
        createdAt: 'DESC',
      },
    });
    return data;
  };
  findAll = async (pg: PaginationDto) => {
    const whereCondition: any = {};
    if (pg.type) {
      whereCondition.type = pg.type;
    }

    if (pg.owners?.length) {
      whereCondition.owner = {
        id: In(pg.owners),
      };
    }
    if (pg.status) {
      if (pg.status === AssessmentStatus.ONLY && !pg.owners?.length) {
        whereCondition.status = In([]);
      } else {
        whereCondition.status = pg.status;
      }
    } else {
      if (!pg.owners?.length) {
        whereCondition.status = Not(AssessmentStatus.ONLY);
      }
    }

    if (pg.name) {
      whereCondition.name = Raw(
        (alias) => `LOWER(${alias}) LIKE LOWER(:name)`,
        {
          name: `%${pg.name}%`,
        },
      );
    }
    if (pg.category) {
      whereCondition.category = {
        id: pg.category,
      };
    }
    if (pg.createdUser) {
      whereCondition.createdUser = pg.createdUser;
    }
    const [data, count] = await this.db.findAndCount({
      where: {
        ...whereCondition,
      },
      take: pg.limit,
      skip: (pg.page == 0 ? 0 : pg.page - 1) * pg.limit,
      relations: ['level', 'category'],
      order: {
        createdAt: 'DESC',
      },
    });
    const total = await this.db.count();
    return {
      data,
      count,
      total,
    };
  };

  findNew = async (
    page: number,
    limit: number,
    filters: {
      name?: string;
      category?: number;
      status?: number;
      type?: number;
      createdUser?: number;
    },
    sortBy:
      | 'updatedAt'
      | 'price'
      | 'completeness'
      | 'count'
      | 'createdAt' = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC',
  ) => {
    const p = +page || 1;
    const l = +limit || 20;

    const query = this.db
      .createQueryBuilder('a')
      .select([
        'a.id          AS id',
        'a.name        AS name',
        'a.status      AS status',
        'a.price       AS price',
        'a.type        AS type',
        'a.updatedAt   AS "updatedAt"',
        'a.createdAt   AS "createdAt"',
        'a.measure     AS measure',
        'a.icons       AS icons',
        'a.usage       AS usage',
        'a.author      AS author',
        'a.description AS description',
        'c.name        AS "categoryName"',
        'u.firstname   AS "firstName"',
        'u.lastname    AS "lastName"',
      ])
      .leftJoin('a.category', 'c')
      .leftJoin('users', 'u', 'u.id = a.createdUser');

    if (filters.name) {
      query.andWhere('LOWER(a.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    }
    if (filters.category) {
      query.andWhere('c.id = :category', { category: filters.category });
    }
    if (filters.status) {
      query.andWhere('a.status = :status', { status: filters.status });
    }
    if (filters.type) {
      query.andWhere('a.type = :type', { type: filters.type });
    }
    if (filters.createdUser) {
      query.andWhere('a.createdUser = :createdUser', {
        createdUser: filters.createdUser,
      });
    }

    const isComputedSort = sortBy === 'completeness' || sortBy === 'count';

    if (!isComputedSort) {
      query.orderBy(`a.${sortBy}`, sortDir);
    } else {
      query.orderBy('a.createdAt', 'DESC');
    }

    const total = await query.getCount();

    const featured = await this.db
      .createQueryBuilder('a')
      .where('a.status = :status', { status: 30 })
      .getCount();

    if (!isComputedSort) {
      query.limit(l).offset((p - 1) * l);
    }

    const items = await query.getRawMany();

    return { items, total, featured };
  };

  updatePoint = async (id: number) => {
    const res = await this.db.findOne({
      where: { id: id },
      relations: ['questionCategories'],
    });
    const point = res?.questionCategories?.reduce(
      (prev, r) => +prev + +r.totalPoint,
      0,
    );
    const questionCount = res?.questionCategories?.reduce(
      (prev, r) => +prev + +r.questionCount,
      0,
    );

    await this.db.save({
      ...res,
      totalPoint: point,
      questionCount: questionCount,
    });
  };

  findOne = async (id: number) => {
    const res = await this.db.findOne({
      where: {
        id: id,
      },
      relations: [
        'level',
        'answerCategories',
        'category',
        'questionCategories',
        'owner',
      ],
    });
    return res;
  };

  query = async (query: string) => {
    return await this.db.query(query);
  };

  save = async (value: AssessmentEntity) => {
    await this.db.save(value);
  };

  countQuestionAssessment = async (ids: number[]) => {
    let res = await Promise.all(
      ids.map(async (id) => await this.question.countQuestionCategory(id)),
    );
    const response = res.reduce((a, b) => a + b, 0);
    return response;
  };
  deleteOne = async (id: number) => {
    return await this.db.delete(id);
  };
  update = async (id: number, dto: CreateAssessmentDto, user: number) => {
    const res = await this.db.findOne({
      where: { id },
    });
    const { answerCategories, ...d } = dto;
    const body = {
      ...d,
      category: {
        id: dto.category,
      },
      level: {
        id: dto.level,
      },
    };

    await this.db.save({ ...res, ...body, updatedUser: user });
  };
  clear = async () => {
    await this.db.createQueryBuilder().delete().execute();
  };
}
