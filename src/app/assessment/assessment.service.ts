import { Injectable } from '@nestjs/common';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentDao } from './dao/assessment.dao';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { AssessmentCategoryService } from '../assessment.category/assessment.category.service';
import { UserDao } from '../user/user.dao';
import { AssessmentEntity } from './entities/assessment.entity';

@Injectable()
export class AssessmentService {
  constructor(
    private dao: AssessmentDao,
    private levelDao: AssessmentLevelDao,
    private categoryDao: AssessmentCategoryService,
    private answerCategory: QuestionAnswerCategoryDao,
    private userDao: UserDao,
  ) {}
  public async create(dto: CreateAssessmentDto, user: number) {
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

  public async findAll() {
    const ass = await this.dao.findAll();

    const res = await Promise.all(
      ass.map(async (as) => {
        const user = await this.getUser(as);
        const category = await this.categoryDao.findOne(as.category.id);

        return {
          data: as,
          user: user,
          category: category,
        };
      }),
    );
    const level = await this.levelDao.findAll();
    return {
      res,
      level,
    };
  }

  public async findAllLevel() {}

  public async findOne(id: number) {
    const res = await this.dao.findOne(id);
    const { answerCategories, category, questionCategories, ...question } = res;
    const cate = await this.categoryDao.findOne(res.category.id);
    const user = await this.getUser(res);
    const count = await this.dao.countQuestionAssessment(
      questionCategories.map((q) => q.id),
    );
    return {
      data: question,
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
