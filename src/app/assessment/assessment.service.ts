import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentDao } from './dao/assessment.dao';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { AssessmentCategoryService } from '../assessment.category/assessment.category.service';
import { UserDao } from '../user/user.dao';
import { AssessmentEntity } from './entities/assessment.entity';
import { UserServiceDao } from '../user.service/user.service.dao';
import { Meta } from 'src/base/base.interface';
import { AssessmentStatus } from 'src/base/constants';
import { ExamService } from '../exam/exam.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import { UserEntity } from '../user/entities/user.entity';
import { CacheService } from 'src/base/cache.service';

// TTL тогтмолууд (ms)
const TTL_LEVELS = 5 * 60_000;      // 5 минут
const TTL_CATEGORIES = 5 * 60_000;  // 5 минут

@Injectable()
export class AssessmentService {
  constructor(
    private dao: AssessmentDao,
    private userServiceDao: UserServiceDao,
    private levelDao: AssessmentLevelDao,
    private categoryDao: AssessmentCategoryService,
    private answerCategory: QuestionAnswerCategoryDao,
    private userDao: UserDao,
    private exam: ExamService,
    private cache: CacheService,
  ) {}
  public async create(dto: CreateAssessmentDto, user: number) {
    let level;
    if (typeof dto.level === 'object') {
      level = await this.levelDao.create(level);
    } else {
      level = dto.level;
    }
    const res = await this.dao.create({
      ...dto,
      createdUser: user,
    });

    const answer = await Promise.all(
      dto.answerCategories.map(async (answer) => {
        const cate = await this.answerCategory.create({
          ...answer,
          assessment: res,
        });
        return cate;
      }),
    );
    return {
      id: res,
      categories: answer,
    };
  }
  public async createLevel(dto: CreateAssessmentLevelDto) {
    return await this.levelDao.create(dto);
  }

  public async findHomePage() {
    const newAss = await Promise.all(
      (await this.dao.find(1, 3, true, -20)).items.map((a) => {
        return {
          data: a,
        };
      }),
    );
    const highlight = (
      await this.dao.find(1, 3, true, AssessmentStatus.HIGHLIGHTED)
    ).items.map((a) => {
      return { data: a };
    });
    const demand = await this.userServiceDao.countDemand(3);
    const demandItems = await Promise.all(
      demand.map(async (d) => {
        const res = await this.dao.findOne(d.assessmentId);
        return {
          data: res,
        };
      }),
    );
    const count = await this.dao.count();
    const { users, orgs } = await this.userDao.countUsers();
    const exams = await this.exam.count();
    return {
      new: newAss,
      highlight: highlight,
      users,
      count,
      exams,
      orgs,
      demand: demandItems,
    };
  }

  public async findAll(pg: PaginationDto, user?: UserEntity) {
    let orgAss = [];
    if (user?.id) {
      const owners = await this.exam.getOwners(user.email);
      orgAss = await this.dao.findOrg([...owners, user.id]);
    }
    const { data, count, total } = await this.dao.findAll(pg);
    const assessments = [...data, ...orgAss];

    // Batch: нэг query-аар бүх userService тоог авна (N+1 арилгана)
    const assessmentIds = assessments.map((a) => a.id);
    const [countMap, allCategories, level] = await Promise.all([
      this.userServiceDao.countByAssessmentBatch(assessmentIds),
      this.cache.getOrSet('assessment_categories', () => this.categoryDao.findAll(), TTL_CATEGORIES),
      this.cache.getOrSet('assessment_levels', () => this.levelDao.findAll(), TTL_LEVELS),
    ]);
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    // Хэрэглэгчийн мэдээллийг batch-аар авна
    const creatorIds = [...new Set(assessments.map((a) => a.createdUser).filter(Boolean))];
    const creators = creatorIds.length
      ? await this.userDao.findByIds(creatorIds)
      : [];
    const creatorMap = new Map(creators.map((u) => [u.id, u]));

    const res = assessments.map((as) => {
      const createdUser = creatorMap.get(as.createdUser) ?? null;
      const updatedUser = creatorMap.get(as.updatedUser) ?? createdUser;
      return {
        data: { ...as, count: countMap.get(as.id) ?? 0 },
        user: { createdUser, updatedUser },
        category: categoryMap.get(as.category?.id) ?? as.category,
      };
    });

    return {
      data: res,
      count: +count + orgAss.length,
      total,
      level,
    };
  }

  public async findNew(
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
      | 'count'
      | 'completeness'
      | 'createdAt' = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { items, total, featured, createdUsers } = await this.dao.findNew(
      page,
      limit,
      filters,
      sortBy,
      sortDir,
    );

    // Batch count — нэг query дотор бүх assessment-ийн тоог авна
    const batchCountMap = await this.userServiceDao.countByAssessmentBatch(
      items.map((a) => a.id),
    );

    const withCompleteness = items.map((a) => {
        const fields = [
          a.categoryName,
          a.measure,
          a.icons,
          a.usage,
          a.author,
          a.description,
          a.duration,
          a.report,
          a.exampleReport,
          a.formule,
          a.advice,
        ];
        const filled = fields.filter(
          (f) => f !== null && f !== undefined && f !== '',
        ).length;
        const completeness = Math.round((filled / fields.length) * 100);
        const count = batchCountMap.get(a.id) ?? 0;
        const feed10 = Number(a.feed10 || 0);
        const feed20 = Number(a.feed20 || 0);
        const feed30 = Number(a.feed30 || 0);
        const feedback = Number(a.feedback || 0);
        const comments = Number(a.comments || 0);

        const percentage =
          feedback > 0
            ? Math.round((feed10 * 100 + feed20 * 50 + feed30 * 0) / feedback)
            : 0;

        return {
          id: a.id,
          name: a.name,
          status: a.status,
          price: a.price,
          updatedAt: a.updatedAt,
          createdAt: a.createdAt,
          count,
          type: a.type,
          category: a.categoryName ?? null,
          createdBy: a.firstName ? `${a.firstName} ${a.lastName}`.trim() : null,
          completeness,
          description: a.description,
          icons: a.icons,
          duration: a.duration,
          author: a.author,
          feedback,
          percentage,
          comments,
        };
      });

    const isComputedSort = sortBy === 'completeness' || sortBy === 'count';

    if (isComputedSort) {
      const sorted = withCompleteness.sort((a, b) =>
        sortDir === 'DESC' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy],
      );
      const paginated = sorted.slice((page - 1) * limit, page * limit);

      return {
        data: paginated,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        meta: {
          featured,
          createdUsers,
        },
      };
    }

    return {
      data: withCompleteness,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        featured,
        createdUsers,
      },
    };
  }

  public async findAllLevel() {}

  public async findOne(id: number) {
    const res = await this.dao.findOne(id);

    if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
    const { answerCategories, category, questionCategories, ...question } = res;
    const cate = await this.categoryDao.findOne(res.category.id);
    const user = await this.getUser(res);
    const count = await this.dao.countQuestionAssessment(
      questionCategories.map((q) => q.id),
    );
    return {
      data: {
        ...question,
        answerCategories,
        category: category,
      },
      category: cate,
      questionCategories: questionCategories,
      count: count,
      user,
    };
  }

  public async getUser(dto: AssessmentEntity) {
    const createdUser = await this.userDao.get(dto.createdUser);
    const updatedUser =
      createdUser.id == dto.updatedUser
        ? createdUser
        : await this.userDao.get(dto.updatedUser);
    return {
      createdUser: createdUser,
      updatedUser: updatedUser,
    };
  }

  public async update(id: number, dto: CreateAssessmentDto, user: number) {
    return await this.dao.update(id, dto, user);
  }

  public async remove(id: number) {
    return await this.dao.deleteOne(id);
  }

  public async clear() {
    await this.dao.clear();
    await this.levelDao.clear();
  }
}
