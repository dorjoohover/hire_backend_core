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
    private answerCategory: QuestionAnswerCategoryDao,
    private questionCategoryDao: QuestionCategoryDao,
  ) {
    super();
  }

  public async getPdf(id: number, role?: number) {
    const res = await this.dao.findByCode(id);
    if (!res.visible && role == Role.client) {
      throw new HttpException(
        'Байгууллагаас зүгээс үр дүнг нууцалсан байна.',
        HttpStatus.FORBIDDEN,
      );
    }
    const assessment = res.assessment;

    return await this.pdfService.createPdfInOneFile(assessment, res);
  }

  public async create(createExamDto: CreateExamDto, user?: UserEntity) {
    const created = createExamDto.created ?? Math.round(Math.random() * 100);
    const code: number = Number(
      BigInt(
        `${Math.round(Math.random() * created * 100)}${Math.round(Date.now() * Math.random())}`,
      ),
    );
    await this.dao.create({ ...createExamDto, code: code }, user);
    return code;
  }

  // onoo bujaats ywuulah
  public async calculateExamById(
    id: number,
    calculate = false,
    user?: UserEntity,
  ) {
    try {
      const exam = await this.dao.findByCode(id);
      if (
        !exam.result &&
        !exam.visible &&
        user.role == Role.client &&
        !calculate
      )
        throw new HttpException(
          'Байгууллагаас зүгээс үр дүнг нууцалсан байна.',
          HttpStatus.FORBIDDEN,
        );
      if (exam.result)
        return {
          calculate: exam.result,
          visible: exam.visible,
          value: parseFloat(exam.result) / exam.assessment.totalPoint,
        };

      const formule = exam.assessment.formule;
      // console.log(formule)
      if (formule) {
        const res = await this.formule.calculate(formule, exam.id);

        const calculate = await this.calculateByReportType(
          res,
          exam.assessment.report,
          user,
          id,
        );
        return {
          calculate,
          visible: exam.visible,
        };
      }
    } catch (error) {
      console.log(error);
    }
  }

  public async calculateByReportType(
    res: any,
    type: number,
    user: UserEntity,
    id: number,
  ) {
    if (type == ReportType.CORRECT) {
      await this.dao.update(+id, {
        result: res[0].point,
        lastname: user?.lastname,
        firstname: user?.firstname,
        email: user?.email,
        phone: user?.phone,
      });
      return res[0].point;
    }
    if (type == ReportType.DISC) {
      let response = '',
        agent = '';
      for (const r of res) {
        let inten,
          total = '';

        const cate = DISC.graph3[(r['aCate'] as string).toLowerCase()];
        const point = +r['point'];
        if (cate != null) {
          for (const [k, v] of Object.entries(cate)) {
            for (const { min, max, intensity } of v as any) {
              if (point == min || max == max) {
                inten = intensity;
                total = `${k}`;
                break;
              }
              if (point >= min || point <= max) {
                inten = intensity;
                total = `${k}`;
                break;
              }
            }
          }
          console.log(total);
          response += total;
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
      console.log('result', agent);
      return agent;
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
  public async updateByCode(code: number, category?: number) {
    const res = await this.dao.findByCode(code);

    if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
    if (res.endDate && res.startDate && res.endDate < new Date())
      throw new HttpException('Хугацаа дууссан байна.', HttpStatus.BAD_REQUEST);
    if (res.userEndDate != null)
      throw new HttpException('Эрх дууссан байна.', HttpStatus.BAD_REQUEST);
    // date false ued ehleh
    // date true ued duusah esvel urgeljluuleh
    const answers = await this.userAnswer.findByCode(code);
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
    let prevQuestions = (await this.detailDao.findByExam(res.id)).map(
      (a) => a.id,
    );
    let currentCategory = category;
    let allCategories = [];

    const categories = await this.questionCategoryDao.findByAssessment(
      res.assessment.id,
    );
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
      allCategories =
        categories.length <= 1
          ? []
          : categories
              .map((cate, i) => {
                if (i > 0) return cate.id;
              })
              .filter((f) => f != undefined);
    }

    if (
      res.userStartDate != null &&
      category == undefined &&
      res.userEndDate == null
    ) {
      allCategories =
        categories.length <= 1
          ? []
          : categories
              .map((cate, i) => {
                if (i > 0) return cate.id;
              })
              .filter((f) => f != undefined);
      currentCategory = categories[0].id;
    }
    if (answers.length > 0) {
      const answeredCategory = answers[answers.length - 1].questionCategory.id;
      const i = allCategories.indexOf(answeredCategory);
      const predictCategory = allCategories[i + 1];
      if (currentCategory < predictCategory) {
        currentCategory = predictCategory;
        allCategories = allCategories.slice(i + 2);
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
      return {
        questions: result.questions,
        category: result.category,
        categories: allCategories,
        assessment: res.assessment,
        token,
      };
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

  public async findByUser(serviceId: number[], id: number) {
    let res = await this.dao.findByUser(serviceId, id);
    const formatted = [];
    for (const r of res) {
      const { assessment, ...body } = r;
      formatted.push({ ...body, totalPoint: assessment.totalPoint });
    }
    return formatted;
  }
  remove(id: number) {
    return `This action removes a #${id} exam`;
  }
}
