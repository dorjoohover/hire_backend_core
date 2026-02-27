import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CreateUserAnswerDto,
  UserAnswerDtoList,
} from './dto/create-user.answer.dto';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { BaseService } from 'src/base/base.service';
import { ExamDao } from '../exam/dao/exam.dao';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ReportService } from '../report/report.service';
import { performance } from 'perf_hooks';
import { EmailService } from '../email/email.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';

@Injectable()
export class UserAnswerService extends BaseService {
  constructor(
    private dao: UserAnswerDao,
    private questionDao: QuestionDao,
    @Inject(forwardRef(() => ExamDao)) private examDao: ExamDao,
    @Inject(forwardRef(() => EmailService)) private mailService: EmailService,
    private questionAnswerDao: QuestionAnswerDao,
    @Inject(forwardRef(() => ReportService)) private report: ReportService,

    private questionAnswerMatrixDao: QuestionAnswerMatrixDao,
    private questionCategoryDao: QuestionCategoryDao,
  ) {
    super();
  }

  public async create(
    dto: UserAnswerDtoList,
    ip: string,
    device: string,
    user?: any,
  ) {
    const userAnswers = [];
    const message = (msg: string) =>
      new HttpException(msg, HttpStatus.BAD_REQUEST);
    const startAll = performance.now(); // ✅ нийт хугацааг эхлүүлэх

    try {
      // Validate input
      if (!dto.data?.length) throw message('Асуултууд ирсэнгүй');

      const exam = await this.examDao.findByCode(dto.data[0].code);
      const questionIds = dto.data.map((d) => d.question);
      if (!exam) throw message('Тест олдсонгүй');
      const questions = await this.questionDao.q(
        `SELECT id, "minValue", "maxValue"
   FROM question
   WHERE id = ANY($1)`,
        [questionIds],
      );
      for (const d of dto.data) {
        const startQuestionLoop = performance.now();
        if (!d.question) throw message('Асуулт байхгүй');
        if (!d.questionCategory) throw message('Асуултын ангилал байхгүй');

        const question = await questions.find(
          (q) => Number(q.id) == Number(d.question),
        );

        if (!question) throw message('Асуулт олдсонгүй');

        // No answer case
        if (!d.answers || d.answers.length === 0) {
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
            ip,
            exam: exam.id,
            device,
            code: dto.data[0].code,
          };

          const r = await this.dao.insert([body]);

          userAnswers.push(r);
          continue;
        }

        // Multiple answers
        const code = dto.data[0].code;
        const answers = d.answers;
        const category = await this.questionCategoryDao.findOne(
          d.questionCategory,
        );
        const is_calculated = category.is_calculated;
        for (const answer of answers) {
          const loopStart = performance.now();

          const result = answer.answer
            ? answer.matrix
              ? await this.dao.query(
                  `select id from "userAnswer" where "matrixId" = ${answer.matrix} and "examId" = ${exam.id} and code = '${code}'`,
                )
              : await this.dao.query(
                  `select id from "userAnswer" where "answerId" = ${answer.answer} and "examId" = ${exam.id} and code = '${code}'`,
                )
            : null;
          if (result) continue;

          let answerCategory = answer.matrix
            ? await this.questionAnswerMatrixDao.query(
                `select "categoryId" from "questionAnswerMatrix" where id = ${answer.matrix}`,
              )
            : !answer.answer && !is_calculated
              ? null
              : await this.questionAnswerDao.query(
                  `select reverse, negative, correct, "categoryId" from "questionAnswer" where id = ${answer.answer}`,
                );
          console.log(answerCategory, 'answerCategory');

          answerCategory = answerCategory?.[0];
          if (
            !answer?.answer &&
            answer?.answer == null &&
            !answer?.point &&
            !answer?.matrix &&
            is_calculated
          )
            continue;
          let point: number;

          if (
            !answer.matrix &&
            (answerCategory as QuestionAnswerEntity)?.reverse &&
            is_calculated
          ) {
            point =
              Number(question?.maxValue ?? question[0]?.maxValue ?? 0) -
              Number(answer.point ?? 0) +
              Number(question?.minValue ?? question[0]?.minValue ?? 0);
          } else {
            let p;

            if (answer.point != null) {
              p = answer.point;
            } else if (answer.matrix) {
              const matrixResult = await this.questionAnswerMatrixDao.query(
                `SELECT point FROM "questionAnswerMatrix" WHERE id = ${answer.matrix}`,
              );
              p = matrixResult[0]?.point;
            } else {
              if (!answer.answer && !is_calculated) {
                p = null;
              } else {
                const answerResult = await this.questionAnswerDao.query(
                  `SELECT point FROM "questionAnswer" WHERE id = ${answer.answer}`,
                );
                p = answerResult[0]?.point;
              }
            }

            point = typeof p === 'number' ? +p : +p;
          }

          if ((answerCategory as QuestionAnswerEntity)?.negative) {
            point = -point;
          }

          const body: CreateUserAnswerDto = {
            ...d,
            startDate: dto.startDate,
            answerCategory: answerCategory?.categoryId ?? null,
            minPoint: question.minValue,
            maxPoint: question.maxValue,
            point,
            answer: answer.answer,
            correct: answer.matrix
              ? false
              : ((answerCategory as QuestionAnswerEntity)?.correct ?? false),
            matrix: answer.matrix,
            value: answer.value,
            ip,
            exam: exam.id,
            device,
            code: dto.data[0].code,
          };

          userAnswers.push(body);
        }

        console.log(
          `✅ Question ${d.question} нийт хугацаа: ${(
            performance.now() - startQuestionLoop
          ).toFixed(2)} ms`,
        );
      }

      await this.dao.insert(userAnswers);

      // Тест дууссан эсэх
      if (dto.end) {
        this.createReport(dto.data[0].code);
        return {
          visible: exam.visible,
        };
      }

      console.log(
        `🎯 Бүх create() нийт хугацаа: ${(performance.now() - startAll).toFixed(
          2,
        )} ms`,
      );
    } catch (error) {
      console.error('❌ Хэрэглэгчийн хариулт бүртгэх үед алдаа:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Дотоод серверийн алдаа',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  public async createReport(code: string) {
    await this.examDao.endExam(code);
    await this.report.createReport({ code });
  }
  public async sendEmail(code: string, logId?: number) {
    const res = await this.examDao.findByCode(+code);
    if (!res?.visible) return;
    const { user, assessment } = res;
    const { email } = user;
    const id = assessment?.id ?? assessment[0].id;
    const name = assessment?.name ?? assessment[0].name;

    await this.mailService.sendReportMail({
      code: code,
      email: email,
      assessmentName: res.assessmentName,
      id: id,
      logId,
      name: name,
    });
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  public async findByCode(code: string) {
    return await this.dao.findByCode(code, 0);
  }
  public async findOne(id: number, code: string) {
    let res = await this.dao.findByCode(code, id);
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

    const groupedByQuestionAndKey = formatted.reduce((acc, item) => {
      const questionId = item.question;

      if (!acc[questionId]) {
        acc[questionId] = {};
      }

      const key = item.answer ?? item.matrix;
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
}
