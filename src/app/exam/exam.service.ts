import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AdminExamDto, CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { BaseService } from 'src/base/base.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { waitForDebugger } from 'inspector';
import { QuestionEntity } from '../question/entities/question.entity';
import { QuestionCategoryEntity } from '../question/entities/question.category.entity';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ExamEntity } from './entities/exam.entity';
import { FormuleService } from '../formule/formule.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { ImageReport } from './reports/exam.pdf';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfService } from './pdf.service';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { AuthService } from 'src/auth/auth.service';
import { ReportType } from 'src/base/constants';
import { DISC } from 'src/assets/report/disc';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { UserDao } from '../user/user.dao';
import { ResultDao } from './dao/result.dao';
import { ResultDetailDto } from './dto/result.dto';
import { AssessmentEntity } from '../assessment/entities/assessment.entity';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { Belbin } from 'src/assets/report/belbin';
import { UpdateDateDto } from '../user.service/dto/update-user.service.dto';
import { maxDigitDISC } from './reports/formatter';
import { PassThrough } from 'stream';
import { FileService } from 'src/file.service';
import { Holland } from 'src/assets/report';

@Injectable()
export class ExamService extends BaseService {
  constructor(
    private dao: ExamDao,
    private formule: FormuleService,
    private detailDao: ExamDetailDao,
    private pdfService: PdfService,
    private questionService: QuestionService,
    private authService: AuthService,
    private userAnswer: UserAnswerDao,
    private userDao: UserDao,
    private resultDao: ResultDao,
    private transactionDao: TransactionDao,
    private userServiceDao: UserServiceDao,
    private questionCategoryDao: QuestionCategoryDao,
    private fileService: FileService,
  ) {
    super();
  }

  public async getPdf(id: number, role?: number) {
    const res = await this.dao.findByCode(id);
    if (!res?.visible && role == Role.client) {
      throw new HttpException(
        'Байгууллагын зүгээс үр дүнг нууцалсан байна.',
        HttpStatus.FORBIDDEN,
      );
    }
    const result = await this.resultDao.findOne(id);
    const doc = await this.pdfService.createPdfInOneFile(result, res);
    const resStream = new PassThrough();
    doc.pipe(resStream);
    // doc.end();
    this.fileService.processMultipleImages(
      [],
      resStream,
      `report-${id}.pdf`,
      'application/pdf',
    );
    return doc;
  }

  public checkExam = async (code: number) => {
    const res = await this.dao
      .query(`select visible from exam where code = ${code}`)
      .then((d) => d[0]);
    return res.visible;
  };
  public endExam = async (code: number, calculate = false) => {
    // new Promise((resolve) => setTimeout(resolve, 10000));
    await this.dao.endExam(code);
    const res = await this.calculateExamById(code, calculate);
    console.log('first', res);
    this.getPdf(code, Role.admin);
    return res;
  };

  public async create(createExamDto: CreateExamDto, user?: UserEntity) {
    const created = createExamDto.created ?? Math.round(Math.random() * 100);
    const code: number = Number(
      BigInt(
        `${Math.round(Math.random() * created * 100)}${Math.round(Date.now() * Math.random())}`,
      ),
    );
    await this.dao.create({ ...createExamDto, code: code }, user);
    const service = await this.userServiceDao.findOne(createExamDto.service);
    await this.transactionDao.create(
      {
        price: service.price,
        count: -service.count,
        service: service.id,
        assessment: service.assessment.id,
        user: service.user.id,
      },
      0,
    );
    return code;
  }

  // onoo bujaats ywuulah
  public async calculateExamById(id: number, calculate = false) {
    try {
      const result = await this.resultDao.findOne(id);
      const exam = await this.dao.findByCode(id);
      let user = exam.user;
      if (user == null) user = await this.userDao.getByEmail(exam.email);
      if (
        exam?.visible != undefined &&
        !result &&
        !exam.visible &&
        user.role == Role.client &&
        !calculate
      )
        throw new HttpException(
          'Байгууллагаас зүгээс үр дүнг нууцалсан байна.',
          HttpStatus.FORBIDDEN,
        );
      console.log('result', result);
      if (result)
        return {
          // calculate: result.,
          visible: exam.visible,
          icons: exam.assessment?.icons,
          value: exam.visible ? result : null,
        };

      const formule = exam.assessment.formule;
      if (formule) {
        const res = await this.formule.calculate(formule, exam.id);
        const calculate = await this.calculateByReportType(res, exam, user, id);
        return {
          calculate,
          visible: exam.visible,
          icons: exam.assessment?.icons,
        };
      }
    } catch (error) {
      console.log(error);
    }
  }
  public async count() {
    return await this.dao.count();
  }
  public async calculateByReportType(
    res: any,
    exam: ExamEntity,
    user: UserEntity,
    id: number,
  ) {
    const type = exam.assessment.report;
    const diff = Math.floor(
      (Date.parse(exam.userEndDate?.toString()) -
        Date.parse(exam.userStartDate?.toString())) /
        60000,
    );
    if (type == ReportType.CORRECT) {
      await this.dao.update(+id, {
        lastname: exam?.lastname ?? user?.lastname,
        firstname: exam?.firstname ?? user?.firstname,
        email: user?.email,
        phone: user?.phone,
        user: {
          id: user.id,
        },
      });
      console.log('res', res);
      console.log(res[0].point);

      await this.resultDao.create({
        assessment: exam.assessment.id,
        assessmentName: exam.assessment.name,
        code: exam.code,
        duration: diff,
        firstname: exam?.firstname ?? user.firstname,
        lastname: exam?.lastname ?? user.lastname,
        type: !res[0]?.formula?.toLowerCase().includes('count')
          ? ReportType.CORRECT
          : ReportType.CORRECTCOUNT,
        limit: exam.assessment.duration,
        total: exam.assessment.totalPoint,
        point: res[0].point,
      });
      return res[0].point;
    }
    if (type == ReportType.SETGEL) {
      console.log({
        total: exam.assessment.totalPoint,
        point: res[0].point,
      });

      const result =
        res[0].point <= 4
          ? 'Бараг байхгүй'
          : res[0].point <= 9
            ? 'Энгийн, сэтгэл гутрал бараг үгүй'
            : res[0].point <= 14
              ? 'Хөнгөн сэтгэл гутрал'
              : res[0].point <= 19
                ? 'Дунд зэргийн сэтгэл гутрал'
                : 'Дундаас дээш зэргийн сэтгэл гутрал';
      await this.resultDao.create({
        assessment: exam.assessment.id,
        assessmentName: exam.assessment.name,
        code: exam.code,
        duration: diff,
        firstname: exam?.firstname ?? user.firstname,
        lastname: exam?.lastname ?? user.lastname,
        type: exam.assessment.report,
        limit: exam.assessment.duration,
        total: exam.assessment.totalPoint,
        result: result,
        value: res[0].point.toString(),
        point: res[0].point,
      });
      return { point: res[0].point };
    }
    if (type == ReportType.EMPATHY) {
      const result =
        res[0].point <= 44
          ? 'Эмпатийн түвшин сул'
          : res[0].point <= 54
            ? 'Эмпатийн оноо тогтвортой түвшинд'
            : 'Өндөр түвшний эмпатийн мэдрэмжтэй';
      await this.resultDao.create({
        assessment: exam.assessment.id,
        assessmentName: exam.assessment.name,
        code: exam.code,
        duration: diff,
        firstname: exam?.firstname ?? user.firstname,
        lastname: exam?.lastname ?? user.lastname,
        type: exam.assessment.report,
        limit: exam.assessment.duration,
        total: exam.assessment.totalPoint,
        result: result,
        value: (res[0].point ?? '').toString(),
        point: res[0].point,
      });
      return { point: res[0].point };
    }
    if (type == ReportType.DISC) {
      const order = ['D', 'i', 'S', 'C'];
      let response = '',
        agent = '';
      const defaultData = order.map((letter) => ({ aCate: letter, point: 0 }));
      const mergedData = defaultData.map(
        (item) =>
          res.find((obj) => obj['aCate']?.toLowerCase() === item.aCate) || item,
      );
      let index = {
        D: [],
        i: [],
        S: [],
        C: [],
      };
      let intens = {
        D: 0,
        i: 0,
        S: 0,
        C: 0,
      };

      for (const r of mergedData) {
        let inten = -1,
          total = '';
        const aCate = r.aCate?.toLowerCase();
        const cate = DISC.graph3[aCate];
        const point = +r['point'];
        if (cate != null) {
          for (const [k, v] of Object.entries(cate)) {
            for (const { min, max, intensity } of v as any) {
              if (point == min && point == max) {
                inten = intensity;
                total = `${k}`;
                break;
              }
              if (point >= min && point <= max) {
                inten = intensity;
                total = `${k}`;
                break;
              }
            }
          }
          response += total;
        }
        if (inten != -1) {
          const float = inten % 1 !== 0;
          let startInterval = 3,
            endInterval = 3;
          if (float) {
            endInterval = 2;
            inten = Math.floor(inten);
          }
          let start = 28 - inten;
          if (start <= 3) {
            start = 0;
            startInterval = 0;
          }
          if (start + endInterval > 27) {
            endInterval = 27 - start;
          }
          const indexs = Object.values(DISC.index[aCate]).slice(
            start - startInterval,
            start + endInterval + 1,
          );
          intens[aCate] = inten;
          index[aCate] = indexs;
        }
      }
      for (const [k, v] of Object.entries(DISC.pattern)) {
        for (const value of v) {
          if (+response == value) {
            agent = k;
            break;
          }
        }
      }
      let details: ResultDetailDto[] = [];
      for (const [k, v] of Object.entries(index)) {
        for (const i of v) {
          details.push({
            category: k,
            cause: intens[k],
            value: i,
          });
        }
      }
      const values = maxDigitDISC(response);
      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: values,
          segment: response,
          value: agent,
        },
        details,
      );
      await this.dao.update(+id, {
        result: agent,
        lastname: user?.lastname,
        firstname: user?.firstname,
        email: user?.email,
        phone: user?.phone,
        user: {
          id: user.id,
        },
      });
      return {
        agent,
        index,
      };
    }
    if (type == ReportType.MBTI) {
      console.log(res);
    }
    if (type == ReportType.DARKTRIAD) {
      console.log(';;;', res);
      let details: ResultDetailDto[] = [];
      for (const r of res) {
        const cate = r['aCate'];
        const point = r['point'];
        details.push({
          cause: point,
          value: cate,
        });
      }
      const max = details.reduce(
        (max, obj) => (parseInt(obj.value) > parseInt(max.value) ? obj : max),
        details[0],
      );
      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: max.value,
          value: max.category,
        },
        details,
      );
      return {
        agent: max.category,
        details,
      };
    }
    if (type == ReportType.BELBIN) {
      let details: ResultDetailDto[] = [];
      for (const r of res) {
        const cate = r['aCate'];
        const point = r['point'];
        details.push({
          cause: point,
          value: cate,
        });
      }
      for (const v of Belbin.values) {
        const include =
          details.filter(
            (detail) => detail.value?.toLowerCase() == v?.toLowerCase(),
          ).length != 0;
        if (!include)
          details.push({
            cause: '0',
            value: v,
          });
      }

      const max = details.reduce(
        (max, obj) => (parseInt(obj.value) > parseInt(max.value) ? obj : max),
        details[0],
      );
      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: max.value,
          value: max.category,
        },
        details,
      );
      return {
        agent: max.category,
        details,
      };
    }
    if (type == ReportType.HOLLAND) {
      let details: ResultDetailDto[] = [];
      for (const r of res) {
        const cate = r['aCate'];
        const point = r['point'];
        details.push({
          cause: point,
          value: cate,
        });
      }

      console.log('res', res);
      for (const v of Holland.values) {
        const include =
          details.filter(
            (detail) => detail.value?.toLowerCase() == v?.toLowerCase(),
          ).length != 0;
        if (!include)
          details.push({
            cause: '0',
            value: v,
          });
      }

      const sorted = details.sort(
        (a, b) => parseInt(b.cause) - parseInt(a.cause),
      );

      const top1 = sorted[0];

      let cutoffIndex = 2;
      while (
        cutoffIndex + 1 < sorted.length &&
        sorted[cutoffIndex].cause === sorted[cutoffIndex + 1].cause
      ) {
        cutoffIndex++;
      }

      const abbrev = sorted
        .slice(0, cutoffIndex + 1)
        .map((d) => d.value[0])
        .join('');

      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: abbrev,
          value: top1.value,
        },
        details,
      );

      return {
        agent: top1.value,
        details,
        result: abbrev,
      };
    }

    if (type == ReportType.GENOS) {
      let details: ResultDetailDto[] = [];
      for (const r of res) {
        const cate = r['aCate'];
        const point = r['point'];
        details.push({
          cause: point,
          value: cate,
        });
      }
      const max = details.reduce(
        (max, obj) => (parseInt(obj.value) > parseInt(max.value) ? obj : max),
        details[0],
      );
      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: max.value + 'чадвар',
          value: max.category,
        },
        details,
      );
      return {
        agent: max.category,
        details,
      };
    }

    if (type == ReportType.NARC) {
      let details: ResultDetailDto[] = [];
      let total = 0;
      for (const r of res) {
        const cate = r['aCate'];
        const count = r['point'];

        total += count;

        details.push({
          cause: count,
          value: cate,
        });
      }
      const max = details.reduce(
        (max, obj) => (parseInt(obj.value) > parseInt(max.value) ? obj : max),
        details[0],
      );

      const result =
        total <= 9
          ? 'Бага түвшин'
          : total <= 15
            ? 'Дундаж түвшин'
            : total <= 20
              ? 'Харьцангуй өндөр түвшин'
              : 'Үнэмлэхүй өндөр түвшин';

      await this.resultDao.create(
        {
          assessment: exam.assessment.id,
          assessmentName: exam.assessment.name,
          code: exam.code,
          duration: diff,
          firstname: exam?.firstname ?? user.firstname,
          lastname: exam?.lastname ?? user.lastname,
          type: exam.assessment.report,
          limit: exam.assessment.duration,
          total: exam.assessment.totalPoint,
          result: result,
          value: total.toString(),
        },
        details,
      );
      return {
        total,
        result,
        all: exam.assessment.totalPoint,
        details,
      };
    }
  }

  public async updateExamByCode(
    code: number,
    dto: {
      email: string;
      firstname: string;
      lastname: string;
      phone: string;
      visible: boolean;
    },
  ) {
    await this.dao.update(code, dto);
  }

  // category questioncount der asuudaltai bga
  public async updateByCode(code: number, con: boolean, category?: number) {
    try {
      const res = await this.dao.findByCode(code);

      if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
      if (res.endDate && res.startDate && res.endDate < new Date())
        throw new HttpException(
          'Хугацаа дууссан байна.',
          HttpStatus.BAD_REQUEST,
        );
      if (res.userEndDate != null)
        throw new HttpException('Эрх дууссан байна.', HttpStatus.BAD_REQUEST);
      // date false ued ehleh
      // date true ued duusah esvel urgeljluuleh
      // const answers = await this.userAnswer.findByCode(code);
      let categoryIndex = 0;

      if (category == -1) {
        await this.dao.update(res.id, {
          ...res,
          userEndDate: new Date(),
        });
        return;
      }
      let token = null;
      const shuffle = res.assessment.questionShuffle;
      const answerShuffle = res.assessment.answerShuffle;
      // let prevQuestions = (await this.detailDao.findByExam(res.id)).map(
      //   (a) => a.id,
      // );
      let prevQuestions = [];
      let allCategories: number[] = [];

      const categoriesByAssessment =
        await this.questionCategoryDao.findByAssessment(res.assessment.id);
      let categories = await Promise.all(
        categoriesByAssessment.map((c) => {
          const { questions, ...body } = c;
          return { ...body };
        }),
      );
      allCategories = await Promise.all(categories.map((cate) => cate.id));
      console.log(allCategories);
      let currentCategory = category ?? allCategories[0];
      categoryIndex = allCategories.indexOf(currentCategory);
      allCategories =
        categoryIndex !== -1
          ? allCategories.slice(categoryIndex)
          : allCategories;
      if (con) {
        for (let i = 0; i < categoriesByAssessment.length; i++) {
          const userAnswer = await this.userAnswer.findByQuestionCategory(
            categoriesByAssessment[i].id,
            res.code,
          );

          if (userAnswer == null) {
            categoryIndex = i;
            break;
          }
        }
      }

      if (res.userStartDate == null && category === undefined) {
        currentCategory = categories[0].id;
        await this.dao.update(res.id, {
          ...res,
          userStartDate: new Date(),
        });
        if (res.email && res.lastname && res.firstname) {
          const user = await this.authService.forceLogin(
            res.email,
            res.phone,
            res.lastname,
            res.firstname,
          );
          token = user;
        }
      }

      if (currentCategory) {
        if (allCategories.length == 0)
          allCategories = await Promise.all(
            (
              await this.questionCategoryDao.findByAssessment(
                res.assessment.id,
                currentCategory,
              )
            ).map((a) => a.id),
          );
        const result = await this.getQuestions(
          shuffle,
          currentCategory,
          answerShuffle,
          prevQuestions,
        );
        await this.createDetail(
          result.questions,
          res.id,
          result.category,
          res.service.id,
        );
        console.log(allCategories, allCategories.slice(1), category);
        return {
          questions: result.questions,
          category: result.category,
          categories: allCategories.slice(1),
          assessment: res.assessment,
          visible: res.visible,
          token,
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  createDetail = async (
    questions: {
      question: QuestionEntity;
      answers: QuestionAnswerEntity[];
    }[],
    exam: number,
    category: QuestionCategoryEntity,
    service: number,
  ) => {
    return Promise.all(
      questions.map(async (question) => {
        await this.detailDao.create({
          exam: exam,
          pageNumber: 0,
          question: question.question.id,
          questionCategory: category.id,
          questionCategoryName: category.name,
          service: service,
        });
      }),
    );
  };
  public async getQuestions(
    shuffle: boolean,
    id: number,
    answerShuffle: boolean,
    questions: number[] = [],
  ) {
    const category = await this.questionCategoryDao.findOne(id);
    const q = await this.questionService.findForExam(
      category.questionCount,
      shuffle,
      id,
      answerShuffle,
      questions,
    );
    const res = {
      questions: q,
      category: category,
    };
    // console.log('getQuestion Res:', res);
    return res;
  }

  public async findExamByService(service: number) {
    return await this.dao.findByService(service);
  }
  public async updateDate(id: number, dto: UpdateDateDto) {
    await this.dao.updateDate(id, dto);
  }
  public async findByUser(serviceId: number[], email: string) {
    let res = await this.dao.findByUser(serviceId, email, 0);
    const formatted = [];
    for (const r of res) {
      const { assessment, ...body } = r;
      formatted.push({ ...body, totalPoint: assessment.totalPoint });
    }
    return formatted;
  }
  public async findByAdmin(dto: AdminExamDto, page: number, limit: number) {
    let [res, count] = await this.dao.findByAdmin(dto, page, limit);
    res = await Promise.all(
      res.map(async (r) => {
        let us = r.user;
        console.log(r.code, r.user, r.email);
        if (r.email != null && us == null)
          us = await this.userDao.getByEmail(r.email);
        const result = await this.resultDao.findOne(r.code);
        return {
          ...r,
          user: us,
          buyer: r.service?.user,
          result,
        };
      }),
    );
    return {
      data: res,
      total: count,
    };
  }
  remove(id: number) {
    return `This action removes a #${id} exam`;
  }
}
