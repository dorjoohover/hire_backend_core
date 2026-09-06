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
import { ResultDao } from '../exam/dao/result.dao';
import { buildAssessmentScoring } from './assessment-scoring.config';

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
    private resultDao: ResultDao,
  ) {
    super();
  }

  public async create(
    dto: UserAnswerDtoList,
    ip: string,
    device: string,
    user?: any,
  ) {
    const message = (msg: string) =>
      new HttpException(msg, HttpStatus.BAD_REQUEST);

    const startAll = performance.now();

    try {
      // Validate input
      if (!dto.data?.length) throw message('Асуултууд ирсэнгүй');

      const exam = await this.examDao.findByCodeOnly(dto.data[0].code);
      if (!exam) throw message('Тест олдсонгүй');

      const code = dto.data[0].code;

      // ---- Бүх лавлах (reference) датаг урьдчилан БАГЦААР ачаална.
      // Өмнө нь асуулт/хариулт бүрд тус тусдаа raw SQL явуулдаг (N+1) байсан.
      const questionIds = [
        ...new Set(dto.data.map((d) => +d.question).filter(Boolean)),
      ];
      const categoryIds = [
        ...new Set(dto.data.map((d) => +d.questionCategory).filter(Boolean)),
      ];
      const answerIds = [
        ...new Set(
          dto.data
            .flatMap((d) => d.answers ?? [])
            .map((a) => a.answer)
            .filter((x) => x != null && Number(x) > 0)
            .map(Number),
        ),
      ];
      const matrixIds = [
        ...new Set(
          dto.data
            .flatMap((d) => d.answers ?? [])
            .map((a) => a.matrix)
            .filter((x) => x != null)
            .map(Number),
        ),
      ];

      const [
        questionRows,
        answerMetaRows,
        matrixMetaRows,
        categoryRows,
        existingRows,
      ] = await Promise.all([
        this.questionDao.findMinMaxByIds(questionIds),
        this.questionAnswerDao.findMetaByIds(answerIds),
        this.questionAnswerMatrixDao.findMetaByIds(matrixIds),
        this.questionCategoryDao.findIsCalculatedByIds(categoryIds),
        this.dao.findExistingByCode(code),
      ]);

      const questionMap = new Map(questionRows.map((q) => [Number(q.id), q]));
      const answerMetaMap = new Map(
        answerMetaRows.map((a) => [Number(a.id), a]),
      );
      const matrixMetaMap = new Map(
        matrixMetaRows.map((m) => [Number(m.id), m]),
      );
      const catCalcMap = new Map(
        categoryRows.map((c) => [Number(c.id), c.is_calculated]),
      );

      // --- Хэрэглэгч буцаж очоод хариултаа сольсон тохиолдолд хуучин мөрүүд DB-д
      // үлдэхгүй байх. Энэ submit-д ирсэн асуулт бүрт зөвхөн "одоогийн сонгосон"
      // (answer/matrix) хослолыг хадгална; өмнө хадгалагдсан ч одоо сонгоогүй
      // мөрүүдийг устгана.
      const submittedQuestionIds = new Set<number>();
      const submittedKeys = new Set<string>();
      const buildKey = (qid: number, aId: any, mId: any) =>
        `${qid}::${aId == null ? 'null' : Number(aId)}::${mId == null ? 'null' : Number(mId)}`;
      for (const d of dto.data) {
        const qid = +d.question;
        submittedQuestionIds.add(qid);
        if (!d.answers || d.answers.length === 0) {
          submittedKeys.add(buildKey(qid, null, null));
        } else {
          for (const a of d.answers) {
            submittedKeys.add(buildKey(qid, a.answer ?? null, a.matrix ?? null));
          }
        }
      }
      const obsoleteIds: number[] = [];
      const remainingExisting = existingRows.filter((r) => {
        const qid = Number(r.questionId);
        if (!submittedQuestionIds.has(qid)) return true; // энэ submit-д огт ороогүй — хадгална
        const k = buildKey(qid, r.answerId, r.matrixId);
        if (submittedKeys.has(k)) return true; // одоо ч сонгогдсон хэвээр — хадгална
        obsoleteIds.push(Number(r.id));
        return false; // өмнө сонгосон ч одоо сонгоогүй — устгана
      });

      // Code-ийн өмнө бүртгэгдсэн хариултууд (dedup-д).
      const existByAnswer = new Map<number, any>();
      const existByMatrix = new Map<number, any>();
      const existByWriteKey = new Map<string, any>();
      for (const r of remainingExisting) {
        if (r.answerId != null) existByAnswer.set(Number(r.answerId), r);
        if (r.matrixId != null) existByMatrix.set(Number(r.matrixId), r);
        const wk =
          r.matrixId != null
            ? `m:${r.questionId}:${r.matrixId}`
            : `a:${r.questionId}:${r.answerId ?? 'null'}`;
        existByWriteKey.set(wk, r);
      }

      const newBodies: CreateUserAnswerDto[] = [];
      const newBodyIndexByKey = new Map<string, number>();
      const updates: {
        id: number;
        point: number;
        value?: string;
        correct?: boolean;
        flag?: boolean;
        ip?: string;
        device?: string;
      }[] = [];

      const pushBody = (key: string, body: CreateUserAnswerDto) => {
        const existing = existByWriteKey.get(key);
        if (existing) {
          // Дахин хариулсан — оноо болон value/correct/flag/ip/device-ийг хамтад
          // нь шинэчилнэ. Урьд нь зөвхөн point шинэчилдэгээс болж текст хариултын
          // солих үед value хуучин хэвээрээ үлддэг алдаа байсан.
          const p = Number(body.point);
          updates.push({
            id: existing.id,
            point: Number.isFinite(p) ? p : 0,
            value: body.value,
            correct: body.correct,
            flag: body.flag,
            ip: body.ip,
            device: body.device,
          });
          return;
        }
        // Нэг submission дотор ижил key давтагдвал сүүлийнх нь дарж бичнэ.
        if (newBodyIndexByKey.has(key)) {
          newBodies[newBodyIndexByKey.get(key)] = body;
        } else {
          newBodyIndexByKey.set(key, newBodies.length);
          newBodies.push(body);
        }
      };

      for (const d of dto.data) {
        if (!d.question) throw message('Асуулт байхгүй');
        if (!d.questionCategory) throw message('Асуултын ангилал байхгүй');

        const question = questionMap.get(+d.question);
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
          };
          pushBody(`a:${+d.question}:null`, body);
          continue;
        }

        const is_calculated = catCalcMap.get(+d.questionCategory);

        for (const answer of d.answers) {
          // Урьд нь "result && is_calculated => continue" гэх шалгуур байсныг
          // арилгав. Энэ нь slider зэрэг ижил answer-ийн point солих үед DB
          // дэх онооны шинэчлэлтийг хааж байсан. dedup-ийг доорх pushBody
          // (existByWriteKey)-аар оновчтой шийднэ — байгаа бол update, байхгүй
          // бол insert.
          const answerCategory = answer.matrix
            ? matrixMetaMap.get(Number(answer.matrix))
            : !answer.answer && !is_calculated
              ? null
              : answerMetaMap.get(Number(answer.answer));

          if (
            !answer?.answer &&
            answer?.answer == null &&
            !answer?.point &&
            !answer?.matrix &&
            !answer?.value &&
            is_calculated
          )
            continue;

          let point: number;
          if (
            !answer.matrix &&
            (answerCategory as any)?.reverse &&
            is_calculated
          ) {
            point =
              Number(question.maxValue ?? 0) -
              Number(answer.point ?? 0) +
              Number(question.minValue ?? 0);
          } else {
            let p: any;
            if (answer.point != null) {
              p = answer.point;
            } else if (answer.matrix) {
              p = matrixMetaMap.get(Number(answer.matrix))?.point;
            } else {
              if (!answer.answer && !is_calculated) {
                p = null;
              } else {
                p = answerMetaMap.get(Number(answer.answer))?.point;
              }
            }
            point = +p;
          }

          if ((answerCategory as any)?.negative) {
            point = -point;
          }

          // Текст/info хариултын point Infinity/NaN болохоос сэргийлж null болгоно
          // (Postgres numeric багана Infinity/NaN авдаг тул урьд нь "Infinity"-ээр
          // хадгалагдаж байсан).
          if (!Number.isFinite(point)) {
            point = null as any;
          }

          // Validate FK references: skip non-existent answer/matrix IDs to
          // avoid FK violation when frontend sends stale IDs after admin edits.
          const safeAnswerId =
            answer.answer && answerMetaMap.has(Number(answer.answer))
              ? answer.answer
              : null;
          const safeMatrixId =
            answer.matrix && matrixMetaMap.has(Number(answer.matrix))
              ? answer.matrix
              : null;
          if (answer.answer && !safeAnswerId) {
            console.warn(
              `⚠️  answerId=${answer.answer} not in questionAnswer — skipping FK`,
            );
          }
          if (answer.matrix && !safeMatrixId) {
            console.warn(
              `⚠️  matrixId=${answer.matrix} not in questionAnswerMatrix — skipping FK`,
            );
          }

          const body: CreateUserAnswerDto = {
            ...d,
            startDate: dto.startDate,
            answerCategory: (answerCategory as any)?.categoryId ?? null,
            minPoint: question.minValue,
            maxPoint: question.maxValue,
            point,
            answer: safeAnswerId,
            correct: answer.matrix
              ? false
              : ((answerCategory as any)?.correct ?? false),
            matrix: safeMatrixId,
            value: answer.value,
            ip,
            exam: exam.id,
            device,
          };

          const wk = answer.matrix
            ? `m:${+d.question}:${answer.matrix}`
            : `a:${+d.question}:${answer.answer || 'null'}`;
          pushBody(wk, body);
        }
      }

      // ---- Хуучин (одоо сонгоогүй) мөрүүдийг устгана → дараа нь batch insert + update.
      await this.dao.deleteByIds(obsoleteIds);
      await this.dao.bulkInsert(newBodies);
      await this.dao.bulkUpdatePoints(updates);

      // Тест дууссан эсэх
      if (dto.end) {
        // endExam (userEndDate бичих) нь заавал биелэх ёстой — үүнгүйгээр
        // тест "дуусаагүй" хэвээр үлдэж, /exam/access/:code нь finished=false
        // буцаана. Иймд үүнийг awaitлана. Тайлан үүсгэх хүсэлт нь удаан
        // (сүлжээгээр) тул арын дэвсгэрт үлдээж, алдааг нь заавал барина —
        // өмнө нь catch-гүй байсан тул unhandled rejection үүсгэдэг байв.
        await this.examDao.endExam(dto.data[0].code);
        this.report
          .createReport({ code: dto.data[0].code })
          .catch((error) =>
            console.error('❌ createReport алдаа:', error?.message),
          );
        return {
          visible: exam.visible,
        };
      }

      console.log(
        `🎯 Бүх create() нийт хугацаа: ${(performance.now() - startAll).toFixed(
          2,
        )} ms (insert=${newBodies.length}, update=${updates.length})`,
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
    // ⚠️ Public/QR урсгалаар өгсөн тест дээр exam.user null байж болно
    // (хэрэглэгч lazy үүсдэг). Өмнө нь энд шууд destructure хийдэг байсан
    // тул TypeError → unhandled rejection → /report/:id/status 500 буцааж,
    // front тал нь "Тайлан боловсруулахад алдаа гарлаа" харуулж, хэрэглэгч
    // тайлангаа хэзээ ч харж чаддаггүй байсан.
    const email = user?.email ?? res.email ?? null;
    if (!assessment) return;
    const id = assessment?.id ?? assessment[0]?.id;
    const name = assessment?.name ?? assessment[0]?.name;
    if (!email) return;

    // await this.mailService.sendReportMail({
    //   code: code,
    //   email: email,
    //   assessmentName: res.assessmentName,
    //   id: id,
    //   logId,
    //   name: name,
    // });
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  // ---- Studio (pdf builder) / report-ийн зориулалттай ----
  // Тухайн тестийн (code) бүх хариултыг category-аар бүлэглэн авна.
  public async getReportAnswers(code: string) {
    return await this.dao.getAnswerAll(code);
  }

  // Нэг category-ийн хариултууд (studio placeholder {category:id} зориулалт).
  // ID-уудыг string-ээр дамжуулна (URL param) — precision алдалтаас сэргийлнэ.
  public async getAnswersByCategory(code: string, categoryId: string) {
    return await this.dao.getAnswersByCategory(code, categoryId);
  }

  // Нэг асуултын хариулт(ууд) (studio placeholder {question:id} зориулалт).
  public async getAnswerByQuestion(code: string, questionId: string) {
    return await this.dao.getAnswerByQuestion(code, questionId);
  }

  // PDF generation-д шаардлагатай бүх дата нэг round-trip-ээр.
  // exam + assessment + result (parent + children) + answers (category-аар) бүгд.
  public async getReportPdfData(code: string) {
    const [exam, result, children, answers] = await Promise.all([
      this.examDao.findByCode(code),
      this.resultDao.findOne(code),
      this.resultDao.findChild(code),
      this.dao.getAnswerAll(code),
    ]);
    if (!exam) {
      throw new HttpException('Тест олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    return {
      exam: {
        code: exam.code,
        firstname: exam.firstname,
        lastname: exam.lastname,
        email: exam.email,
        phone: exam.phone,
        visible: exam.visible,
        assessmentName: exam.assessmentName,
        createdAt: exam.createdAt,
        startDate: exam.startDate,
        endDate: exam.endDate,
        userStartDate: exam.userStartDate,
        userEndDate: exam.userEndDate,
      },
      assessment: exam.assessment ?? null,
      result, // parent result (point, total, type, details, г.м)
      children, // SEMUT-ийн sub-test result-ууд
      answers, // category-аар бүлэгсэн хариултууд
    };
  }

  public async findByCode(code: string) {
    const [answers, exam] = await Promise.all([
      this.dao.findByCode(code, 0),
      this.examDao.findByCode(code),
    ]);

    let assessment = null;
    if (exam?.assessment) {
      const categories = await this.questionCategoryDao.findByAssessmentId(
        exam.assessment.id,
      );
      assessment = {
        ...exam.assessment,
        result: buildAssessmentScoring(exam.assessment, categories),
      };
    }

    return {
      answers,
      assessment,
    };
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
