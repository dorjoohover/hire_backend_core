import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PdfTemplateDao } from './pdf-template.dao';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionAnswerCategoryService } from '../question/question.answer.category.service';
import { AssessmentAiDataDao } from './assessment-ai-data.dao';
import { AssessmentVariableDao } from './assessment-variable.dao';
import { ExamDao } from '../exam/dao/exam.dao';

@Injectable()
export class PdfTemplateService {
  constructor(
    private dao: PdfTemplateDao,
    private questionCategoryDao: QuestionCategoryDao,
    private answerCategoryService: QuestionAnswerCategoryService,
    private aiDataDao: AssessmentAiDataDao,
    private examDao: ExamDao,
    private variableDao: AssessmentVariableDao,
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

  async saveAiData(assessmentId: number, data: Record<string, any>) {
    if (!assessmentId) {
      throw new HttpException('assessmentId шаардлагатай.', HttpStatus.BAD_REQUEST);
    }
    const row = await this.aiDataDao.upsert(assessmentId, data);
    return { data: row?.data ?? null };
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
