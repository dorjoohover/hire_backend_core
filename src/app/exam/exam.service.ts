import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { AdminExamDto, CreateExamDto } from './dto/create-exam.dto';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { BaseService } from 'src/base/base.service';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionRuleDao } from '../question/dao/question.rule.dao';
import { QuestionRuleAction } from '../question/entities/question.rule.entity';
import { QuestionEntity } from '../question/entities/question.entity';
import { QuestionCategoryEntity } from '../question/entities/question.category.entity';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { ExamEntity } from './entities/exam.entity';
import { FormuleService } from '../formule/formule.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { AuthService } from 'src/auth/auth.service';
import { CLIENT, ORGANIZATION, ReportType } from 'src/base/constants';
import { UserDao } from '../user/user.dao';
import { ResultDao } from './dao/result.dao';
import { ResultDetailDto } from './dto/result.dto';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { UpdateDateDto } from '../user.service/dto/update-user.service.dto';
import { FileService } from 'src/file.service';
import { ReportService } from '../report/report.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import { performance } from 'perf_hooks';
import * as QRCode from 'qrcode';

@Injectable()
export class ExamService extends BaseService {
  constructor(
    private dao: ExamDao,
    private detailDao: ExamDetailDao,
    private questionService: QuestionService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService,
    @Inject(forwardRef(() => UserAnswerDao)) private userAnswer: UserAnswerDao,
    private userDao: UserDao,
    private resultDao: ResultDao,
    private transactionDao: TransactionDao,
    @Inject(forwardRef(() => UserServiceDao))
    private userServiceDao: UserServiceDao,
    private questionCategoryDao: QuestionCategoryDao,
    private questionRuleDao: QuestionRuleDao,
  ) {
    super();
  }

  public async getPdf(id: number | string, role?: number) {
    const res = await this.dao.findByCode(id);
    if (!res?.visible && role == Role.client) {
      throw new HttpException(
        'Байгууллагын зүгээс үр дүнг нууцалсан байна.',
        HttpStatus.FORBIDDEN,
      );
    }
    return true;
    // const result = await this.resultDao.findOne(id);
    // const doc = await this.pdfService.createPdfInOneFile(result, res);
    // const resStream = new PassThrough();
    // doc.pipe(resStream);
    // // doc.end();
    // this.fileService.processMultipleImages(
    //   [],
    //   resStream,
    //   `report-${id}.pdf`,
    //   'application/pdf',
    // );
    // return doc;
  }

  public checkExam = async (code: string) => {
    // Parameterized query — өмнө нь code-ийг шууд string interpolation хийдэг
    // байсан нь SQL injection эрсдэлтэй байв.
    const res = await this.dao.getVisibleByCode(code);
    return res?.visible;
  };

  // Байгууллага нэг хэрэглэгчид зориулж тест (code) үүсгээд, тэр code-оор QR
  // үүсгэнэ. Клиент QR уншаад и-мэйлгүйгээр тест өгөх боломжтой.
  public async generateQr(code: string) {
    const exam = await this.dao.findByCode(code);
    if (!exam) {
      throw new HttpException('Тест олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    const base = process.env.WEB_URL ?? 'https://hire.mn';
    const url = `${base.replace(/\/$/, '')}/exam/${code}`;
    const qr = await QRCode.toDataURL(url, { width: 400, margin: 1 });
    return { code, url, qr };
  }
  // public endExam = async (code: string) => {
  //   await this.dao.endExam(code);
  //   console.log('start', code);
  //   await this.report.createReport({ code });
  // };
  public async create(createExamDto: CreateExamDto, user?: UserEntity) {
    const created = createExamDto.created ?? Math.round(Math.random() * 100);
    const code = Number(
      BigInt(
        `${Math.round(Math.random() * created * 100)}${Math.round(Date.now() * Math.random())}`,
      ),
    ).toString();
    console.log('exam dto', createExamDto);
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

  public async count() {
    return await this.dao.count();
  }

  public async updateExamByCode(
    code: string,
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

  public async getOwners(email: string) {
    return await this.dao.findAllOwners(email);
  }

  async getExamInfoByCode(code: string, user?: UserEntity) {
    const result = await this.resultDao.findOne(code);

    if (!result) {
      throw new HttpException(
        'Шалгалтын хариу олдсонгүй.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const exam = await this.dao.findByCode(code);

    // if (!user) {
    //   throw new HttpException(
    //     'Хэрэглэгч нэвтрэх шаардлагатай.',
    //     HttpStatus.FORBIDDEN,
    //   );
    // }
    if (!exam) {
      throw new HttpException('Үр дүн олдсонгүй.', HttpStatus.BAD_REQUEST);
    }

    if (!exam.visible && user.role == CLIENT) {
      throw new HttpException(
        'Байгууллагын зүгээс үр дүнг нууцалсан байна.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (user && user.role == CLIENT && user?.id != exam.user.id) {
      throw new HttpException(
        'Тайлан харах эрхгүй байна.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      user &&
      user.role === ORGANIZATION &&
      exam.service?.user?.id &&
      exam?.service?.user?.id != user?.id
    ) {
      throw new HttpException(
        'Тайлан харах эрхгүй байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isInvited = exam.email != null && exam.user == null;

    const orgName = exam.service?.user?.organizationName ?? null;

    const icons = exam.assessment?.icons ?? null;

    return {
      assessmentName: exam.assessmentName,
      assessment: exam.assessment,
      firstname: exam.firstname,
      lastname: exam.lastname,
      createdAt: result.createdAt,
      type: result.type,
      result: result.result,
      total: result.total,
      point: result.point,
      value: result.value,
      isInvited,
      orgName,
      icons,
    };
  }

  // category questioncount der asuudaltai bga
  public async updateByCode(code: string, con: boolean, category?: number) {
    const startAll = performance.now();
    try {
      console.time('⏱ dao.findByCode');
      const res = await this.dao.findByCode(code);
      console.timeEnd('⏱ dao.findByCode');

      if (!res) throw new HttpException('Олдсонгүй.', HttpStatus.NOT_FOUND);
      if (res.endDate && res.startDate && res.endDate < new Date())
        throw new HttpException(
          'Хугацаа дууссан байна.',
          HttpStatus.BAD_REQUEST,
        );
      if (res.userEndDate != null)
        throw new HttpException('Эрх дууссан байна.', HttpStatus.BAD_REQUEST);

      let categoryIndex = 0;
      let token = null;

      // -1 => тестийг хаах
      if (category == -1) {
        console.time('⏱ dao.update (userEndDate)');
        await this.dao.update(res.id, {
          ...res,
          userEndDate: new Date(),
        });
        console.timeEnd('⏱ dao.update (userEndDate)');

        console.log(
          `🎯 updateByCode нийт хугацаа: ${(
            performance.now() - startAll
          ).toFixed(2)} ms`,
        );
        return;
      }

      const shuffle = res.assessment.questionShuffle;
      const answerShuffle = res.assessment.answerShuffle;

      let prevQuestions: number[] = [];
      let allCategories: number[] = [];

      console.time('⏱ questionCategoryDao.findByAssessment');
      const categoriesByAssessment =
        await this.questionCategoryDao.findByAssessment(res.assessment.id);
      console.timeEnd('⏱ questionCategoryDao.findByAssessment');

      const categories = categoriesByAssessment.map((c) => {
        const { questions, ...body } = c;
        return { ...body };
      });

      allCategories = categories.map((cate) => cate.id);
      console.log('📌 allCategories:', allCategories);

      let currentCategory = category ?? allCategories[0];
      categoryIndex = allCategories.indexOf(currentCategory);
      allCategories =
        categoryIndex !== -1
          ? allCategories.slice(categoryIndex)
          : allCategories;

      if (con) {
        console.time('⏱ check userAnswer by categories');
        // Өмнө нь category тус бүрд тусдаа query явуулдаг байсныг (N round-trip)
        // ганц query-ээр бөглөгдсөн category-уудыг татаж орлуулав.
        const answeredCategoryIds = new Set(
          await this.userAnswer.findAnsweredCategoryIds(res.code),
        );
        for (let i = 0; i < categoriesByAssessment.length; i++) {
          if (!answeredCategoryIds.has(categoriesByAssessment[i].id)) {
            categoryIndex = i;
            break;
          }
        }
        console.timeEnd('⏱ check userAnswer by categories');
      }

      if (res.userStartDate == null && category === undefined) {
        currentCategory = categories[0].id;
        const date = new Date();

        console.time('⏱ dao.update (userStartDate)');
        await this.dao.update(res.id, {
          ...res,
          userStartDate: date,
        });
        console.timeEnd('⏱ dao.update (userStartDate)');

        if (res.email && (res.lastname || res.firstname)) {
          console.time('⏱ authService.forceLogin');
          const user = await this.authService.forceLogin(
            res.email,
            res.phone,
            res.lastname ?? '',
            res.firstname ?? '',
          );
          console.timeEnd('⏱ authService.forceLogin');

          console.time('⏱ dao.update (attach user)');
          await this.dao.update(res.id, {
            ...res,
            userStartDate: date,
            user: user.user,
          });
          console.timeEnd('⏱ dao.update (attach user)');

          token = user.token;
        }
      }

      if (currentCategory) {
        if (allCategories.length == 0) {
          console.time('⏱ questionCategoryDao.findByAssessment (fallback)');
          allCategories = (
            await this.questionCategoryDao.findByAssessment(
              res.assessment.id,
              currentCategory,
            )
          ).map((a) => a.id);
          console.timeEnd('⏱ questionCategoryDao.findByAssessment (fallback)');
        }

        console.time('⏱ getQuestions');
        const result = await this.getQuestions(
          shuffle,
          currentCategory,
          answerShuffle,
          prevQuestions,
          res.code,
        );
        console.timeEnd('⏱ getQuestions');

        console.time('⏱ createDetail');
        await this.createDetail(
          result.questions,
          res.id,
          result.category,
          res.service.id,
        );
        console.timeEnd('⏱ createDetail');

        console.log(
          `🎯 updateByCode нийт хугацаа: ${(
            performance.now() - startAll
          ).toFixed(2)} ms`,
        );

        // Бүх хэсгийн жагсаалт болон бөглөгдсөн төлөв (D#4 буцаж очих UI-д
        // хэрэгтэй). categories: дараа үлдсэн id-уудыг хадгална (хуучин үйлдэл).
        const answeredSet = new Set(
          await this.userAnswer.findAnsweredCategoryIds(res.code),
        );
        const allCategoriesDetailed = categoriesByAssessment.map((c) => ({
          id: c.id,
          name: c.name,
          orderNumber: c.orderNumber,
          answered: answeredSet.has(c.id),
        }));

        return {
          questions: result.questions,
          category: result.category,
          categories: allCategories.slice(1),
          allCategories: allCategoriesDetailed,
          rules: (result as any).rules ?? [],
          assessment: res.assessment,
          visible: res.visible,
          token,
        };
      }
    } catch (error) {
      console.error('❌ updateByCode алдаа:', error);
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
    code?: string,
  ) {
    const category = await this.questionCategoryDao.findOne(id);
    let q = await this.questionService.findForExam(
      category.questionCount,
      shuffle,
      id,
      answerShuffle,
      questions,
    );

    // Нөхцөлт алгасах (branching) дүрмийг хэрэглэнэ.
    // Server тал: өмнө илгээсэн хариултад тулгуурлан хэсэг хооронд асуулт шүүх.
    // Client тал: тухайн хуудсан дотор (live skip) ашиглах rules-ийг буцаана.
    let rules: any[] = [];
    if (code) {
      const allIds = q
        .map((x) => Number(x.question?.id))
        .filter(Boolean) as number[];
      if (allIds.length) {
        const fetchedRules =
          await this.questionRuleDao.findByTargetQuestionIds(allIds);
        if (fetchedRules.length) {
          const prior = await this.userAnswer.findExistingByCode(code);
          const answeredPairs = new Set(
            prior
              .filter((p) => p.answerId != null)
              .map((p) => `${Number(p.questionId)}:${Number(p.answerId)}`),
          );
          const answeredQuestions = new Set(
            prior.map((p) => Number(p.questionId)),
          );
          const skip = new Set<number>();
          for (const rule of fetchedRules) {
            if (rule.action !== QuestionRuleAction.SKIP) continue;
            const dq = Number(rule.dependsOnQuestionId);
            const matched =
              rule.dependsOnAnswerId != null
                ? answeredPairs.has(`${dq}:${Number(rule.dependsOnAnswerId)}`)
                : answeredQuestions.has(dq);
            if (matched) skip.add(Number(rule.targetQuestionId));
          }
          if (skip.size) {
            q = q.filter((x) => !skip.has(Number(x.question?.id)));
          }
          // Зөвхөн энэ хуудсанд live skip хэрэглэгдэх дүрмүүдийг л буцаана
          // (target ба depends хоёулаа одоо харагдах асуултуудын дотор).
          const remainingIds = new Set(
            q.map((x) => Number(x.question?.id)),
          );
          rules = fetchedRules
            .filter(
              (r) =>
                r.action === QuestionRuleAction.SKIP &&
                remainingIds.has(Number(r.targetQuestionId)) &&
                remainingIds.has(Number(r.dependsOnQuestionId)),
            )
            .map((r) => ({
              id: r.id,
              targetQuestionId: Number(r.targetQuestionId),
              dependsOnQuestionId: Number(r.dependsOnQuestionId),
              dependsOnAnswerId:
                r.dependsOnAnswerId != null
                  ? Number(r.dependsOnAnswerId)
                  : null,
              action: r.action,
            }));
        }
      }
    }

    return {
      questions: q,
      category: category,
      rules,
    };
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
  public async findByCode(code: string | string) {
    return await this.dao.findByCode(code);
  }
  public async findByAdmin(pg: PaginationDto) {
    let [res, count] = await this.dao.findByAdmin(pg);
    res = await Promise.all(
      res.map(async (r) => {
        let us = r.user;
        console.log(r.code, r.user?.email, r.email);
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

  public async findAllNew(
    page: number,
    limit: number,
    filters: {
      assessment?: number;
      buyer?: number;
      email?: string;
      examstatus?: number;
      startDate?: string;
      endDate?: string;
    },
    sortBy:
      | 'createdAt'
      | 'userStartDate'
      | 'userEndDate'
      | 'startDate'
      | 'endDate'
      | 'email'
      | 'firstname'
      | 'lastname'
      | 'code'
      | 'visible'
      | 'assessmentName'
      | 'buyerOrganizationName'
      | 'examstatus' = 'createdAt',
    sortDir: 'ASC' | 'DESC' = 'DESC',
  ) {
    const { items, total, assessments, buyers, counts } =
      await this.dao.findAllNew(page, limit, filters, sortBy, sortDir);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        assessments,
        buyers,
        counts,
      },
    };
  }

  async deleteResult(code: string) {
    await this.resultDao.delete(code);
  }
}
