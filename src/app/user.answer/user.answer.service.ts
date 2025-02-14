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
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ExamService } from '../exam/exam.service';

@Injectable()
export class UserAnswerService extends BaseService {
  constructor(
    private dao: UserAnswerDao,
    private questionDao: QuestionDao,
    private examDao: ExamDao,
    private examService: ExamService,
    private questionAnswerDao: QuestionAnswerDao,
    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private assessmentDao: AssessmentDao,
  ) {
    super();
  }
  public async create(
    dto: UserAnswerDtoList,
    ip: string,
    device: string,
    user?: any,
  ) {
    try {
      let message = '';
      let status = HttpStatus.BAD_REQUEST;
      const res = [];
      const exam = await this.examDao.findByCode(dto.data[0].code);
      for (const d of dto.data) {
        console.log(d);
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
        if (d.answers.length == 0) {
          const body: CreateUserAnswerDto = {
            ...d,
            startDate: dto.startDate,
            answerCategory: null,
            minPoint: question.minValue,
            maxPoint: question.maxValue,
            point: null,
            answer: null,
            correct: false,
            matrix: null,
            ip: ip,
            exam: exam.id,
            device: device,
          };
          const r = await this.dao.create(body);
          res.push(r);
        }
        await Promise.all(
          d.answers.map(async (answer, i) => {
            // if (i > 0) return;
            let answerCategory = answer.matrix
              ? await this.questionAnswerMatrixDao.findOne(answer.matrix)
              : await this.questionAnswerDao.findOne(answer.answer);

            const point =
              answer.point ??
              (answer.matrix
                ? await this.questionAnswerMatrixDao.findOne(answer.matrix)
                : await this.questionAnswerDao.findOne(answer.answer));
            const body: CreateUserAnswerDto = {
              ...d,
              startDate: dto.startDate,
              answerCategory: answerCategory?.category?.id ?? null,
              minPoint: question.minValue,
              maxPoint: question.maxValue,
              point: typeof point === 'number' ? +point : +point.point,
              answer: answer.answer,
              correct: answer.matrix
                ? null
                : ((point as QuestionAnswerEntity)?.correct ?? null),
              matrix: answer.matrix,
              value: answer.value,
              ip: ip,
              exam: exam.id,
              device: device,
            };
            const r = await this.dao.create(body);
            res.push(r);
          }),
        );
        if (dto.end) {
          await this.examDao.endExam(dto.data[0].code);
          const res = await this.examService.calculateExamById(
            dto.data[0].code,
            user,
          );
          console.log(res);
        }
      }

      // if (res.includes(undefined)) {
      //   res.map(async (r) => {
      //     if (r != undefined) await this.dao.deleteOne(r);
      //   });
      //   console.log(res)
      //   // throw new HttpException(message, status);
      // }
      // return res;
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

  public async findByCode(code: number) {
    return await this.dao.findByCode(code, 0);
  }
  public async findOne(id: number, code: number) {
    let res = await this.dao.findByCode(code, id);
    console.log(res);
    const formatted = await Promise.all(
      res.map((r) => {
        const key = r.answer?.id;
        return {
          answer: key,
          matrix: r.matrix != null ? r.matrix.id : null,
          type: r.question.type,
          flag: r.flag,
          point: r.point,
          question: r.question.id,
        };
      }),
    );
    console.log(formatted);

    const groupedByQuestionAndKey = formatted.reduce((acc, item) => {
      const questionId = item.question;

      if (!acc[questionId]) {
        acc[questionId] = {};
      }

      const key = item.answer;
      if (key == undefined) {
        acc[questionId] = {};
      } else {
        if (!acc[questionId][key]) {
          acc[questionId][key] = [];
        }

        acc[questionId][key].push(item);
      }

      return acc;
    }, {});
    Object.keys(groupedByQuestionAndKey).forEach((questionId) => {
      const answers = groupedByQuestionAndKey[questionId];

      Object.keys(answers).forEach((answerId) => {
        const uniqueAnswers = Array.from(
          new Set(answers[answerId].map((item) => JSON.stringify(item))),
        ).map((item) => JSON.parse(`${item}`));

        answers[answerId] = uniqueAnswers; // Replace with unique objects
      });
    });

    return {
      data: groupedByQuestionAndKey,
      startDate: res?.[0]?.startDate,
      endDate: res?.[0]?.endDate,
    };
  }

  update(id: number, updateUserAnswerDto: UpdateUserAnswerDto) {
    return `This action updates a #${id} userAnswer`;
  }
}
