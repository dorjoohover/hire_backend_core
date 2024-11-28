import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { BaseService } from 'src/base/base.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { waitForDebugger } from 'inspector';

@Injectable()
export class ExamService extends BaseService {
  constructor(
    private dao: ExamDao,
    private detailDao: ExamDetailDao,
    private questionDao: QuestionDao,
    private questionCategoryDao: QuestionCategoryDao,
  ) {
    super();
  }
  public async create(createExamDto: CreateExamDto) {
    const code: number = Number(
      BigInt(`${Math.round(Math.random() * 10000)}${Date.now()}`),
    );
    await this.dao.create({ ...createExamDto, code: code });
  }

  public async updateByCode(code: number, date: boolean, category?: number) {
    // date false ued ehleh
    // date true ued duusah esvel urgeljluuleh
    const res = await this.dao.findByCode(code);
    if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
    if (res.endDate != null)
      throw new HttpException('Эрх дууссан байна.', HttpStatus.BAD_REQUEST);
    const shuffle = res.assessment.questionShuffle;
    if (!date) {
      const categories = await this.questionCategoryDao.findByAssessment(
        res.assessment.id,
      );
      const category = categories[0];
      const questions = await this.getQuestions(shuffle, category.id);
      await this.dao.update(res.id, {
        ...res,
        userStartDate: new Date(),
      });
      return {
        questions: questions,
        categories: categories.map((cate) => cate.id),
      };
    }
    if (category) {
      const questions = await this.getQuestions(shuffle, category);
      return {
        questions: questions,
      };
    } else {
      await this.dao.update(res.id, {
        ...res,
        userEndDate: new Date(),
      });
    }
  }

  public async getQuestions(shuffle: boolean, id: number) {
    const category = await this.questionCategoryDao.findOne(id);

    return await this.questionDao.findByCategory(
      category.questionCount,
      shuffle,
      category.id,
    );
  }

  remove(id: number) {
    return `This action removes a #${id} exam`;
  }
}
