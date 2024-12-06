import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CalculateUserAnswerDto,
  CreateUserAnswerDto,
  UserAnswerDtoList,
} from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { BaseService } from 'src/base/base.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';

@Injectable()
export class UserAnswerService extends BaseService {
  constructor(
    private dao: UserAnswerDao,
    private questionDao: QuestionDao,
    private examDao: ExamDao,
    private questionAnswerDao: QuestionAnswerDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private assessmentDao: AssessmentDao,
  ) {
    super();
  }
  public async create(dto: UserAnswerDtoList, ip: string, device: string) {
    let message = '';
    let status = HttpStatus.BAD_REQUEST;
    const res = [];
    for (const d of dto.data) {
      if (!d.question) {
        message = 'Асуулт байхгүй';
        status = HttpStatus.BAD_REQUEST;
        break;
      }
      if (!d.questionCategory) {
        message = 'Асуултын ангилал байхгүй';
        status = HttpStatus.BAD_REQUEST;
        break;
      }
      if (!d.answer) {
        message = 'Хариулт байхгүй';
        status = HttpStatus.BAD_REQUEST;
        break;
      }
      if (!d.answerCategory) {
        const category = await this.questionAnswerDao.findOne(d.answer);
        d.answerCategory = category.category?.id;
      }

      const point =
        d.point ??
        (d.matrix
          ? (await this.questionAnswerMatrixDao.findOne(d.matrix)).point
          : (await this.questionAnswerDao.findOne(d.answer)).point);
      const question = await this.questionDao.findOne(d.question);
      if (!d || d == null) {
        message = 'Оноогүй байна.';
        status = HttpStatus.BAD_REQUEST;
        break;
      }
      const body: CreateUserAnswerDto = {
        ...d,
        minPoint: question.minValue,
        maxPoint: question.maxValue,
        point: point,
        ip: ip,
        device: device,
      };
      const r = await this.dao.create(body);
      res.push(r);
    }
    if (res.includes(undefined)) {
      res.map(async (r) => {
        if (r != undefined) await this.dao.deleteOne(r);
      });
      throw new HttpException(message, status);
    }
    return res;
  }

  public async calculate(dto: CalculateUserAnswerDto) {
    // const exam = await this.examDao.findOne(id)
    // const dto = JSON.parse(exam.assessment.function) as CalculateUserAnswerDto
    // tests der hj bga
    // if(dto.answerCategory)
  }

  findAll() {
    return `This action returns all userAnswer`;
  }

  findOne(id: number) {
    return `This action returns a #${id} userAnswer`;
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }
}
