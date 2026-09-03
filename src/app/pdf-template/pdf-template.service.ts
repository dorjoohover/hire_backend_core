import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PdfTemplateDao } from './pdf-template.dao';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionAnswerCategoryService } from '../question/question.answer.category.service';
import { AssessmentAiDataDao } from './assessment-ai-data.dao';
import { AssessmentVariableDao } from './assessment-variable.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';

// "AI Data" tab-ийн "Хувьсагчаас" талбарууд aiJsonData дотор {{custom.<key>}}
// (эсвэл текст доторх {{custom.<key>}} орсон урт текст) хэлбэрээр хадгалагддаг —
// Studio дээр засварлахад ойлгомжтой байхын тулд ЗАВСРЫН declarative token.
// ai-export/:assessmentId дуудагдах бүрд, боломжтой бол, эдгээрийг БОДИТ
// утгаар сольж өгнө: assessment_variable-ийн entries нь зөвхөн 1 мөртэй
// (өөрөөр хэлбэл тухайн assessment дээр үр дүнгээс үл хамааран НЭГ л утгатай,
// DISC маягийн олон үр дүнгээр ялгаатай биш) бол шууд тэр утгаар; хэд хэдэн
// мөртэй (үр дүнгээс хамаарч өөр өөр текст) бол — тодорхой шалгуулагч/exam
// энэ endpoint-д байхгүй тул аль нь тохирохыг мэдэхгүй — бүх entries-ийг
// object хэлбэрээр дамжуулна (AI agent өөрөө сонгоно), ганц опаск {{token}}
// хоосон харагдахаас илүү дор хаяж бодит датаг дамжуулна. Ердийн (custom биш,
// жиш нь {{assessment.totalScore}}, {{user.firstname}}) token-ууд тодорхой
// exam/шалгуулагчгүйгээр огт олдохгүй тул орлуулагдахгүй хэвээр үлдэнэ.
const CUSTOM_TOKEN_FULL = /^\{\{custom\.([a-zA-Z0-9_]+)\}\}$/;
const CUSTOM_TOKEN_ANY = /\{\{custom\.([a-zA-Z0-9_]+)\}\}/g;

function resolveCustomTokensDeep(value: any, entriesByKey: Map<string, Record<string, string>>): any {
  if (typeof value === 'string') {
    const fullMatch = value.match(CUSTOM_TOKEN_FULL);
    if (fullMatch) {
      const entries = entriesByKey.get(fullMatch[1]);
      if (entries) {
        const keys = Object.keys(entries);
        if (keys.length === 1) return entries[keys[0]];
        if (keys.length > 1) return entries;
      }
      return value;
    }
    // Текст доторх (олон token хольсон) хэлбэрт зөвхөн ГАНЦ entry-тэй
    // variable-уудыг л шууд орлуулж чадна (олон утгатайг текст рүү
    // шууд шигтгэх боломжгүй тул хэвээр үлдээнэ).
    return value.replace(CUSTOM_TOKEN_ANY, (full, key) => {
      const entries = entriesByKey.get(key);
      if (entries) {
        const keys = Object.keys(entries);
        if (keys.length === 1) return entries[keys[0]];
      }
      return full;
    });
  }
  if (Array.isArray(value)) {
    return value.map((v) => resolveCustomTokensDeep(v, entriesByKey));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = resolveCustomTokensDeep(v, entriesByKey);
    });
    return out;
  }
  return value;
}

@Injectable()
export class PdfTemplateService {
  constructor(
    private dao: PdfTemplateDao,
    private questionCategoryDao: QuestionCategoryDao,
    private answerCategoryService: QuestionAnswerCategoryService,
    private aiDataDao: AssessmentAiDataDao,
    private examDao: ExamDao,
    private variableDao: AssessmentVariableDao,
    private assessmentDao: AssessmentDao,
  ) {}

  // Studio-ийн "Хэрэглэгчийн variable" — тухайн assessment дээр хэрэглэгчийн
  // өөрөө үүсгэсэн бүх нэрлэсэн map-ийг буцаана (жиш: characterDescription).
  async getVariables(assessmentId: number) {
    if (!assessmentId) return { data: [] };
    const rows = await this.variableDao.findAllByAssessmentId(assessmentId);
    return { data: rows };
  }

  async saveVariable(
    assessmentId: number,
    key: string,
    label: string | undefined,
    entries: Record<string, string>,
  ) {
    if (!assessmentId) {
      throw new HttpException('assessmentId шаардлагатай.', HttpStatus.BAD_REQUEST);
    }
    if (!key || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key)) {
      throw new HttpException(
        'variable-ийн key зөвхөн үсэг/тоо/"_" агуулж, үсгээр эхэлсэн байх ёстой (жиш: characterDescription).',
        HttpStatus.BAD_REQUEST,
      );
    }
    const row = await this.variableDao.upsert(assessmentId, key, label, entries);
    return { data: row };
  }

  async deleteVariable(assessmentId: number, key: string) {
    if (!assessmentId) {
      throw new HttpException('assessmentId шаардлагатай.', HttpStatus.BAD_REQUEST);
    }
    return this.variableDao.remove(assessmentId, key);
  }

  // AI Data tab-ийн "JSON өгөгдөл" — тухайн assessment дээр хадгалагдсан
  // JSON-ыг буцаана (pdf_template-ээс ТУСДАА, assessment бүрт ганцхан).
  async getAiData(assessmentId: number) {
    if (!assessmentId) return { data: null };
    const row = await this.aiDataDao.findByAssessmentId(assessmentId);
    return { data: row?.data ?? null };
  }

  // Тестийн КОД-оор нь AI JSON-ыг буцаана — тухайн exam-ийн assessmentId-г
  // эхлээд ExamDao.findByCodeOnly-гоор олж, дараа нь дээрх getAiData-г
  // дуудна (нэг л логик, давхардуулахгүй).
  async getAiDataByExamCode(code: string) {
    const exam = await this.examDao.findByCodeOnly(code);
    if (!exam?.assessment?.id) {
      throw new HttpException(`Тест олдсонгүй: "${code}"`, HttpStatus.NOT_FOUND);
    }
    return this.getAiData(exam.assessment.id);
  }

  // AI agent-аас дуудагдах экспорт — тухайн assessment дээр report
  // generation-д ОДОО ашиглагдаж буй (isActive=true) загварын aiJsonData
  // болон "Хэрэглэгчийн variable"-уудыг НЭГ payload болгож нэгтгэнэ.
  // assessmentId-аар шүүнэ (тодорхой exam/code биш) — учир нь энэ дата
  // (идэвхтэй загвар, variable-ууд) нь бүгд assessment-ийн түвшинд
  // тодорхойлогддог, тухайн тестийг өгсөн хүн бүрд адилхан.
  async getAiExportByAssessmentId(assessmentId: number) {
    const assessment = await this.assessmentDao.findOne(assessmentId);
    if (!assessment) {
      throw new HttpException(
        `Assessment олдсонгүй: "${assessmentId}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    const [activeTemplate, variableRows, standaloneAiData] = await Promise.all([
      // AI-д зориулсан дата авахдаа: тухайн assessmentId дээрх идэвхтэй
      // (report generation-д яг одоо ашиглагдаж буй) загварыг олоод, ТҮҮНИЙ
      // aiJsonData-г ашиглана — assessment_ai_data (assessmentId-аар шууд) биш.
      this.dao.findActiveByAssessmentId(assessmentId),
      this.variableDao.findAllByAssessmentId(assessmentId),
      // ⚠️ FALLBACK: хэрэв тухайн assessment дээр идэвхтэй template огт
      // байхгүй (эсвэл идэвхжсэн ч aiJsonData нь sync хийгдээгүй, жиш нь
      // template үүсэхээс өмнө AI Data tab-д бичигдсэн) бол Studio-ийн AI
      // Data tab-д хэрэглэгчийн шууд бичиж хадгалсан assessment_ai_data-г
      // доор нь fallback болгож уншина. updateActiveAiJsonData() нь
      // ЗӨВХӨН идэвхтэй template байгаа үед л sync хийдэг тул (2026-08-20
      // баталгаажсан: assessmentId 4, 57 дээр assessment_ai_data-д мөр
      // байсан ч active_template огт байхгүй байсан) энэ fallback-гүйгээр
      // хэрэглэгч өгөгдөл бичсэн ч ai-export/AI agent дээр хоосон харагддаг байв.
      this.aiDataDao.findByAssessmentId(assessmentId),
    ]);

    // Postgres "numeric" багана TypeORM-аар string болж ирдэг тул тоо болгож
    // хөрвүүлнэ (формат хийх дунд шат) — AI agent талд string/number холилдохоос сэргийлнэ.
    const toNum = (v: any): number | null =>
      v === null || v === undefined || v === '' ? null : Number(v);

    const rawAiData =
      activeTemplate?.aiJsonData ?? standaloneAiData?.data ?? null;

    return {
      assessment: {
        id: assessment.id,
        name: assessment.name,
        author: assessment.author ?? null,
        about: assessment.description ?? null,
        usage: assessment.usage ?? null,
        totalPoint: toNum(assessment.totalPoint),
        type: assessment.type ?? null,
        classificationCode: assessment.classificationCode ?? null,
      },
      // Идэвхтэй (report generation-д ашиглагдаж буй) загварт хадгалагдсан
      // AI JSON (bandCode/bandLabel/interpretation, subscales[], bands[] гэх
      // мэт) — Studio-ийн "AI Data" tab-аар бэлдэгдээд, тухайн загвар
      // хадгалагдах бүрд aiJsonData болж бичигдсэн байдаг. Идэвхтэй template
      // байхгүй/sync хийгдээгүй бол дээрх standaloneAiData-руу fallback хийнэ.
      template: activeTemplate ? { id: activeTemplate.id, name: activeTemplate.name } : null,
      aiData: resolveCustomTokensDeep(
        rawAiData,
        new Map((variableRows || []).map((v) => [v.key, v.entries || {}])),
      ),
      // Studio-ийн "Хэрэглэгчийн variable" — key -> {label, entries} map.
      variables: Object.fromEntries(
        (variableRows || []).map((v) => [
          v.key,
          { label: v.label ?? null, entries: v.entries ?? {} },
        ]),
      ),
    };
  }

  async saveAiData(assessmentId: number, data: Record<string, any>) {
    if (!assessmentId) {
      throw new HttpException('assessmentId шаардлагатай.', HttpStatus.BAD_REQUEST);
    }
    const row = await this.aiDataDao.upsert(assessmentId, data);
    // Идэвхтэй загвар байвал шууд синк хийнэ — үгүй бол AI Data tab дээрх
    // өөрчлөлт зөвхөн assessment_ai_data-д хадгалагдаад, ai-export/:assessmentId
    // (идэвхтэй загварын aiJsonData-г л уншдаг) дээр "Загвар хадгалах" товч
    // дарах хүртэл гарч ирэхгүй байх байсан.
    await this.dao.updateActiveAiJsonData(assessmentId, data ?? null);
    return { data: row?.data ?? null };
  }

  // Тухайн assessmentId дээр PDF report үүсгэхэд аль зам ашиглагдахыг
  // тодорхойлно — hire_report/src/pdf.services.ts-ийн createPdfInOneFile()
  // дотор бодитоор хэрэгждэг дараалалтай ЯГ ИЖИЛ (core өөрөө PDF зурдаггүй,
  // зөвхөн pdf_template өгөгдлийг эзэмшдэг тул энд зөвхөн ТОДОРХОЙЛНО):
  //   1) assessmentId-аар idэвхтэй (isActive=true) Studio template байгаа
  //      эсэхийг эхэлж шалгана (findActiveByAssessmentId).
  //   2) байвал: "dynamic" — тэр template ашиглагдана (DynamicTemplateRenderer,
  //      hire_report талд). Идэвхтэй template сонгогдсон бол ямар ч тохиолдолд
  //      hardcoded руу чимээгүй буцахгүй (hire_report-ийн render error дээр
  //      throw хийдэгтэй адил санаа) — иймд эндээс "dynamic" гэж буцсан үед
  //      legacyReportType-ыг үл тоомсорлоно.
  //   3) идэвхтэй template байхгүй бол: "legacy" — assessment.report
  //      (ReportType enum)-д харгалзах hardcoded renderer ашиглагдана.
  async resolveRenderTarget(assessmentId: number): Promise<{
    mode: 'dynamic' | 'legacy';
    assessmentId: number;
    template: { id: number; name: string } | null;
    legacyReportType: number | null;
  }> {
    if (!assessmentId) {
      throw new HttpException('assessmentId шаардлагатай.', HttpStatus.BAD_REQUEST);
    }

    const [activeTemplate, assessment] = await Promise.all([
      this.dao.findActiveByAssessmentId(assessmentId),
      this.assessmentDao.findOne(assessmentId),
    ]);

    if (!assessment) {
      throw new HttpException(
        `Assessment олдсонгүй: "${assessmentId}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    // hire_report-ийн createPdfInOneFile()-тэй адил: template мөр байгаа ч
    // pages нь хоосон бол идэвхтэй гэж тооцохгүй (хуучин руу унана) —
    // "template" мөр үүссэн ч Studio дээр хуудас/блок огт нэмээгүй тохиолдол.
    if (activeTemplate?.pages?.length) {
      return {
        mode: 'dynamic',
        assessmentId,
        template: { id: activeTemplate.id, name: activeTemplate.name },
        legacyReportType: null,
      };
    }

    return {
      mode: 'legacy',
      assessmentId,
      template: null,
      legacyReportType: assessment.report ?? null,
    };
  }

  // Studio-ийн AI Data tab-д "Асуултын ангилал" (score-section-ийн адилхан,
  // жишээ нь "Section 1") болон "Хариултын ангилал" (DISC-ийн D/i/S/C гэх
  // мэт) сонголтуудыг тухайн assessment дээр бодитоор байгаа нэрсээр нь
  // харуулахад ашиглана. Зөвхөн НЭР/ID-г буцаана — оноог биш (оноо зөвхөн
  // бодит exam-тай холбогдоход л тооцогддог, report generation талд).
  async getCategories(assessmentId: number) {
    if (!assessmentId) {
      return { questionCategories: [], answerCategories: [] };
    }
    const [questionCategories, answerCategories] = await Promise.all([
      this.questionCategoryDao.findByAssessmentId(assessmentId),
      this.answerCategoryService.findByAssessment(assessmentId),
    ]);
    return {
      questionCategories: questionCategories.map((c) => ({ id: c.id, name: c.name })),
      answerCategories: answerCategories.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  async create(dto: CreatePdfTemplateDto) {
    return await this.dao.create(dto);
  }

  async findAll(assessmentTypeCode?: string, assessmentId?: number) {
    return await this.dao.findAll(assessmentTypeCode, assessmentId);
  }

  async findOne(id: number) {
    const res = await this.dao.findOne(id);
    if (!res) {
      throw new HttpException('Загвар олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    return res;
  }

  async update(id: number, dto: UpdatePdfTemplateDto) {
    await this.findOne(id);
    return await this.dao.update(id, dto);
  }

  // Тухайн report-ыг "report generation-д ашиглах" гэж тэмдэглэнэ. Ижил
  // assessmentId дээрх бусад бүх report автоматаар idle болно.
  async setActive(id: number) {
    const current = await this.findOne(id);
    if (!current.assessmentId) {
      throw new HttpException(
        'Assessment хавсаргаагүй загварыг идэвхжүүлэх боломжгүй.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return await this.dao.setActive(id, current.assessmentId);
  }

  async remove(id: number) {
    await this.findOne(id);
    return await this.dao.remove(id);
  }
}
