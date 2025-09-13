import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
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

    const [items, total] = await this.db.findAndCount({
      where: {
        status: status <= 0 ? Not(Math.abs(status)) : status,
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

  findAll = async (pg: PaginationDto) => {
    const whereCondition: any = {};
    if (pg.type) {
      whereCondition.type = pg.type;
    }
    if (pg.status) {
      whereCondition.status = pg.status;
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
      whereCondition.createdUser = {
        createdUser: pg.createdUser,
      };
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
