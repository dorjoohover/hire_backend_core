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
    try {
      let message = '';
      let status = HttpStatus.BAD_REQUEST;
      const res = [];

      const exam = await this.examDao.findByCode(dto.data[0].code);
      for (const d of dto.data) {
        if (!d.question) {
          message = 'Асуулт байхгүй';
          status = HttpStatus.BAD_REQUEST;
          throw new HttpException(message, status);
        }

        if (!d.questionCategory) {
          message = 'Асуултын ангилал байхгүй';
          status = HttpStatus.BAD_REQUEST;
          throw new HttpException(message, status);
        }
        // if (!d.answer) {
        //   message = 'Хариулт байхгүй';
        //   status = HttpStatus.BAD_REQUEST;
        //   throw new HttpException(message, status);
        // }
        const question = await this.questionDao.findOne(d.question);
        if (!d || d == null) {
          message = 'Оноогүй байна.';
          status = HttpStatus.BAD_REQUEST;
          throw new HttpException(message, status);
        }
        await Promise.all(
          d.answers.map(async (answer, i) => {
            // if (i > 0) return;
            const answerCategory = await this.questionAnswerDao.findOne(
              answer.answer,
            );
            const point =
              answer.point ??
              (answer.matrix
                ? (await this.questionAnswerMatrixDao.findOne(answer.matrix))
                    .point
                : (await this.questionAnswerDao.findOne(answer.answer)).point);
            const body: CreateUserAnswerDto = {
              ...d,
              answerCategory: answerCategory?.category?.id ?? null,
              minPoint: question.minValue,
              maxPoint: question.maxValue,
              point: point,
              answer: answer.answer,
              correct: d.correct,
              matrix: answer.matrix,
              value: answer.value,
              ip: ip,
              exam: exam.id,
              device: device,
            };
            console.log(body);
            const r = await this.dao.create(body);
            console.log(r);
            res.push(r);
          }),
        );
      }
      if (res.includes(undefined)) {
        res.map(async (r) => {
          if (r != undefined) await this.dao.deleteOne(r);
        });
        throw new HttpException(message, status);
      }
      return res;
    } catch (error) {
      console.log(error);
    }
  }

  public async calculate(dto: CalculateUserAnswerDto) {
    // const exam = await this.examDao.findOne(id)
    // const dto = JSON.parse(exam.assessment.function) as CalculateUserAnswerDto
    // tests der hj bga
    // if(dto.answerCategory)
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  public async findOne(id: number) {
    const res = await this.dao.findByCode(id);
    res.reduce((acc, item) => {
      const questionId = item.question.id;
      if (!acc[questionId]) {
        acc[questionId] = [];
      }
      acc[questionId].push(item);

      return acc;
    }, {});
    return res;
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }
}
