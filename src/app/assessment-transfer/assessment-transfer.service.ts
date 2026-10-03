import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, EntityTarget, In } from 'typeorm';
import * as mime from 'mime-types';
import { AssessmentEntity } from '../assessment/entities/assessment.entity';
import { LevelEntity } from '../assessment/entities/assessment.level.entity';
import { AssessmentFormulaEntity } from '../assessment/entities/assessment.formule.entity';
import { AssessmentCategoryEntity } from '../assessment.category/entities/assessment.category.entity';
import { FormulaEntity } from '../formule/formule.entity';
import { QuestionCategoryEntity } from '../question/entities/question.category.entity';
import { QuestionEntity } from '../question/entities/question.entity';
import { QuestionAnswerEntity } from '../question/entities/question.answer.entity';
import { QuestionAnswerMatrixEntity } from '../question/entities/question.answer.matrix.entity';
import { QuestionAnswerCategoryEntity } from '../question/entities/question.answer.category.entity';
import { QuestionRuleEntity } from '../question/entities/question.rule.entity';
import { PdfTemplateEntity } from '../pdf-template/entities/pdf-template.entity';
import { AssessmentVariableEntity } from '../pdf-template/entities/assessment-variable.entity';
import { AssessmentAiDataEntity } from '../pdf-template/entities/assessment-ai-data.entity';
import { QuestionAnswerViewService } from '../question/question-answer-view.service';
import { FileService } from 'src/file.service';
import { AssessmentStatus } from 'src/base/constants';
import {
  AssessmentBundle,
  BLOCKED_FILE_EXT,
  BUNDLE_FORMAT,
  BUNDLE_VERSION,
  Fields,
  assertBundle,
  bundleStats,
  fileKeyFromField,
  fileKeysInText,
  nameCandidates,
  orderByParent,
  remapQuestionTokens,
} from './assessment-bundle';

export interface ImportResult {
  id: number;
  name: string;
  status: number;
  stats: ReturnType<typeof bundleStats>;
  files: { written: number; existing: number; skipped: string[] };
  warnings: string[];
}

// Эх орчны хэрэглэгч / огноо — шинэ орчинд утгагүй тул bundle-д оруулахгүй.
const SKIP_FIELDS = new Set(['createdUser', 'updatedUser', 'createdAt', 'updatedAt']);
const INSERT_CHUNK = 200;

/**
 * Assessment-ийг bundle (JSON) болгох / bundle-ээс шинэ assessment үүсгэх.
 * Оруулалт нь НЭГ transaction — алдаа гарвал хагас дутуу тест үлдэхгүй.
 * Шинэ тест үргэлж "Архив" (идэвхгүй) төлөвтэй үүснэ — admin шалгаад өөрөө нээнэ.
 */
@Injectable()
export class AssessmentTransferService {
  private readonly logger = new Logger(AssessmentTransferService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly files: FileService,
    private readonly view: QuestionAnswerViewService,
  ) {}

  // =========================================================================
  // EXPORT
  // =========================================================================
  async exportBundle(
    assessmentId: number,
    opts: { includeFiles?: boolean } = {},
  ): Promise<AssessmentBundle> {
    const includeFiles = opts.includeFiles !== false;
    const ids = (rel: string[]) => ({ relations: rel, disableMixedMap: false });

    const src: any = await this.ds.getRepository(AssessmentEntity).findOne({
      where: { id: assessmentId },
      loadRelationIds: ids(['category', 'level']),
    });
    if (!src) throw new NotFoundException(`Тест (id=${assessmentId}) олдсонгүй.`);

    const [category, level] = await Promise.all([
      src.category
        ? this.ds.getRepository(AssessmentCategoryEntity).findOne({ where: { id: src.category } })
        : null,
      src.level ? this.ds.getRepository(LevelEntity).findOne({ where: { id: src.level } }) : null,
    ]);
    const formule = src.formule
      ? await this.ds.getRepository(FormulaEntity).findOne({ where: { id: src.formule } })
      : null;

    // --- асуултын бүлэг → асуулт → хариулт → матриц
    const qcs = await this.ds.getRepository(QuestionCategoryEntity).find({
      where: { assessment: { id: assessmentId } },
      order: { orderNumber: 'ASC', id: 'ASC' },
    });
    const qcIds = qcs.map((x) => x.id);
    const questions: any[] = qcIds.length
      ? await this.ds.getRepository(QuestionEntity).find({
          where: { category: { id: In(qcIds) } },
          loadRelationIds: ids(['category']),
          order: { id: 'ASC' },
        })
      : [];
    const qIds = questions.map((x) => x.id);
    const answers: any[] = qIds.length
      ? await this.ds.getRepository(QuestionAnswerEntity).find({
          where: { question: { id: In(qIds) } },
          loadRelationIds: ids(['question', 'category']),
          order: { id: 'ASC' },
        })
      : [];
    const aIds = answers.map((x) => x.id);
    const matrixWhere: any[] = [];
    if (qIds.length) matrixWhere.push({ question: { id: In(qIds) } });
    if (aIds.length) matrixWhere.push({ answer: { id: In(aIds) } });
    const matrixRows: any[] = matrixWhere.length
      ? await this.ds.getRepository(QuestionAnswerMatrixEntity).find({
          where: matrixWhere,
          loadRelationIds: ids(['question', 'answer', 'category']),
          order: { id: 'ASC' },
        })
      : [];
    const qIdSet = new Set(qIds);
    const aIdSet = new Set(aIds);

    // --- хариултын ангилал: энэ тестийнх + хариулт/матрицын заасан + тэдгээрийн parent
    const acRepo = this.ds.getRepository(QuestionAnswerCategoryEntity);
    const acRows = new Map<number, any>();
    for (const r of await acRepo.find({
      where: { assessment: { id: assessmentId } },
      loadRelationIds: ids(['parent']),
    })) {
      acRows.set(r.id, r);
    }
    let pending = new Set<number>();
    for (const r of acRows.values()) if (r.parent) pending.add(r.parent);
    for (const r of [...answers, ...matrixRows]) if (r.category) pending.add(r.category);
    for (let depth = 0; depth < 20; depth++) {
      const missing = [...pending].filter((id) => !acRows.has(id));
      if (!missing.length) break;
      const rows: any[] = await acRepo.find({
        where: { id: In(missing) },
        loadRelationIds: ids(['parent']),
      });
      pending = new Set();
      for (const r of rows) acRows.set(r.id, r);
      // олдоогүй (устсан) ангиллыг дахин хайхгүй
      for (const id of missing) if (!acRows.has(id)) acRows.set(id, null);
      for (const r of rows) if (r.parent) pending.add(r.parent);
    }
    const acList = [...acRows.values()].filter(Boolean);
    const acIdSet = new Set(acList.map((r) => r.id));
    const acRef = (id: any) => (id != null && acIdSet.has(id) ? id : null);

    // --- тайлангийн олон-дэд-оноотой томьёо (assessment_formulas)
    const afRows: any[] = await this.ds.getRepository(AssessmentFormulaEntity).find({
      where: { assessment: { id: assessmentId } },
      loadRelationIds: ids(['parent', 'question_category', 'formule']),
      order: { id: 'ASC' },
    });
    const fIds = [...new Set(afRows.map((r) => r.formule).filter(Boolean))];
    const formulaById = new Map<number, FormulaEntity>(
      (fIds.length
        ? await this.ds.getRepository(FormulaEntity).find({ where: { id: In(fIds) } })
        : []
      ).map((f) => [f.id, f]),
    );
    const afIdSet = new Set(afRows.map((r) => r.id));
    const qcIdSet = new Set(qcIds);

    // --- skip-дүрэм, Studio, хувьсагч, AI
    const rules = qIds.length
      ? await this.ds.getRepository(QuestionRuleEntity).find({
          where: { targetQuestionId: In(qIds) },
          order: { id: 'ASC' },
        })
      : [];
    const templates = await this.ds
      .getRepository(PdfTemplateEntity)
      .find({ where: { assessmentId }, order: { id: 'ASC' } });
    const variables = await this.ds
      .getRepository(AssessmentVariableEntity)
      .find({ where: { assessmentId }, order: { id: 'ASC' } });
    const aiData = await this.ds
      .getRepository(AssessmentAiDataEntity)
      .findOne({ where: { assessmentId } });

    const omit = (entity: EntityTarget<any>, row: any, extra: string[] = []) =>
      this.scalarFields(entity, row, new Set(extra));

    const bundle: AssessmentBundle = {
      format: BUNDLE_FORMAT,
      version: BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      source: { assessmentId, name: src.name },
      assessment: {
        fields: omit(AssessmentEntity, src),
        category: category ? { id: category.id, name: category.name } : null,
        level: level ? { id: level.id, name: level.name } : null,
        formule: formule ? omit(FormulaEntity, formule) : null,
      },
      answerCategories: acList.map((r) => ({
        ref: r.id,
        parentRef: acRef(r.parent),
        fields: omit(QuestionAnswerCategoryEntity, r),
      })),
      questionCategories: qcs.map((r) => ({ ref: r.id, fields: omit(QuestionCategoryEntity, r) })),
      questions: questions.map((r) => ({
        ref: r.id,
        categoryRef: r.category,
        fields: omit(QuestionEntity, r),
      })),
      answers: answers.map((r) => ({
        ref: r.id,
        questionRef: r.question,
        categoryRef: acRef(r.category),
        fields: omit(QuestionAnswerEntity, r),
      })),
      matrix: matrixRows.map((r) => ({
        ref: r.id,
        questionRef: r.question != null && qIdSet.has(r.question) ? r.question : null,
        answerRef: r.answer != null && aIdSet.has(r.answer) ? r.answer : null,
        categoryRef: acRef(r.category),
        fields: omit(QuestionAnswerMatrixEntity, r),
      })),
      assessmentFormulas: afRows.map((r) => ({
        ref: r.id,
        parentRef: r.parent != null && afIdSet.has(r.parent) ? r.parent : null,
        questionCategoryRef:
          r.question_category != null && qcIdSet.has(r.question_category)
            ? r.question_category
            : null,
        formule: formulaById.has(r.formule) ? omit(FormulaEntity, formulaById.get(r.formule)) : null,
        fields: omit(AssessmentFormulaEntity, r),
      })),
      rules: rules.map((r) => ({
        targetQuestionRef: r.targetQuestionId,
        dependsOnQuestionRef: r.dependsOnQuestionId,
        dependsOnAnswerRef: r.dependsOnAnswerId ?? null,
        dependsOnMatrixRef: r.dependsOnMatrixId ?? null,
        targetAnswerRef: r.targetAnswerId ?? null,
        fields: omit(QuestionRuleEntity, r, [
          'targetQuestionId',
          'dependsOnQuestionId',
          'dependsOnAnswerId',
          'dependsOnMatrixId',
          'targetAnswerId',
        ]),
      })),
      pdfTemplates: templates.map((t) => ({ fields: omit(PdfTemplateEntity, t, ['assessmentId']) })),
      variables: variables.map((v) => ({ fields: omit(AssessmentVariableEntity, v, ['assessmentId']) })),
      aiData: aiData ? { fields: omit(AssessmentAiDataEntity, aiData, ['assessmentId']) } : null,
      files: [],
      missingFiles: [],
    };

    if (includeFiles) {
      const keys = this.collectFileKeys(bundle);
      for (const key of [...keys].sort()) {
        const buf = await this.files.readBytes(key);
        if (!buf) {
          bundle.missingFiles.push(key);
          continue;
        }
        bundle.files.push({
          key,
          contentType: (mime.lookup(key) || 'application/octet-stream') as string,
          base64: buf.toString('base64'),
        });
      }
    }
    return bundle;
  }

  /** Bundle-ийн текст, файл заадаг талбаруудаас бүх файлын түлхүүрийг цуглуулна. */
  collectFileKeys(b: AssessmentBundle): Set<string> {
    const out = new Set<string>();
    const a = b.assessment.fields;
    fileKeyFromField(a.icons, out);
    fileKeyFromField(a.exampleReport, out);
    for (const k of ['description', 'usage', 'measure', 'advice']) fileKeysInText(a[k], out);
    for (const r of b.questionCategories) {
      fileKeyFromField(r.fields.url, out);
      fileKeysInText(r.fields.name, out);
      fileKeysInText(r.fields.value, out);
    }
    for (const r of b.questions) {
      fileKeyFromField(r.fields.file, out);
      fileKeysInText(r.fields.name, out);
      fileKeysInText(JSON.stringify(r.fields.settings ?? null), out);
    }
    for (const r of b.answers) {
      fileKeyFromField(r.fields.file, out);
      fileKeysInText(r.fields.value, out);
    }
    for (const r of b.matrix) fileKeysInText(r.fields.value, out);
    for (const r of [...b.pdfTemplates, ...b.variables, ...(b.aiData ? [b.aiData] : [])]) {
      fileKeysInText(JSON.stringify(r.fields), out);
    }
    return out;
  }

  // =========================================================================
  // IMPORT
  // =========================================================================
  async importBundle(
    input: unknown,
    userId: number,
    opts: { mode?: 'import' | 'copy'; skipFiles?: boolean } = {},
  ): Promise<ImportResult> {
    try {
      assertBundle(input);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Bundle буруу байна.');
    }
    const b = input as AssessmentBundle;
    const mode = opts.mode ?? 'import';
    const warnings: string[] = [];
    const dropped = new Set<string>();

    // 1) Файлууд — transaction-аас ӨМНӨ (ижил түлхүүрээр; байгаа бол алгасна).
    //    DB алдаа гарвал хэрэглэгдээгүй файл үлдэх нь хор хөнөөлгүй.
    const fileRes = { written: 0, existing: 0, skipped: [] as string[] };
    if (!opts.skipFiles) {
      for (const f of b.files) {
        if (BLOCKED_FILE_EXT.test(f.key)) {
          fileRes.skipped.push(f.key);
          continue;
        }
        if (await this.files.exists(f.key)) {
          fileRes.existing++;
          continue;
        }
        const buf = Buffer.from(f.base64, 'base64');
        await this.files.upload(f.key, f.contentType || 'application/octet-stream', buf);
        fileRes.written++;
      }
      if (fileRes.skipped.length) {
        warnings.push(`Аюулгүй биш өргөтгөлтэй ${fileRes.skipped.length} файлыг оруулсангүй: ${fileRes.skipped.join(', ')}`);
      }
      if (b.missingFiles.length) {
        warnings.push(
          `Эх орчинд олдоогүй ${b.missingFiles.length} файл (зураг) энд ч харагдахгүй: ${b.missingFiles.slice(0, 10).join(', ')}${b.missingFiles.length > 10 ? '…' : ''}`,
        );
      }
    }

    // 2) DB — нэг transaction (алдаа гарвал бүгд буцна)
    const created = await this.runTx(async (m) => {
      const insertOne = async (entity: EntityTarget<any>, row: Fields): Promise<number> => {
        const res = await m.getRepository(entity).insert(row);
        return res.identifiers[0].id;
      };
      const insertMany = async (entity: EntityTarget<any>, rows: Fields[]): Promise<number[]> => {
        const ids: number[] = [];
        for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
          const res = await m.getRepository(entity).insert(rows.slice(i, i + INSERT_CHUNK));
          for (const idf of res.identifiers) ids.push(idf.id);
        }
        return ids;
      };
      const pick = (entity: EntityTarget<any>, fields: Fields, label: string) =>
        this.pickKnown(entity, fields, label, dropped);
      const newFormula = async (fields: Fields | null): Promise<number | null> => {
        if (!fields) return null;
        return insertOne(FormulaEntity, { ...pick(FormulaEntity, fields, 'formule'), createdUser: userId });
      };

      // --- нэр (UNIQUE)
      const name = await this.freeName(m, b.assessment.fields.name, mode);

      // --- ангилал / түвшин: ID + нэр таарвал, эсвэл нэрээр; олдохгүй бол хоосон
      const categoryId = await this.matchLookup(m, AssessmentCategoryEntity, b.assessment.category);
      if (b.assessment.category && !categoryId) {
        warnings.push(`Тестийн ангилал "${b.assessment.category.name}" энэ орчинд алга — ангилалгүй үүслээ, тохиргооноос сонгоно уу.`);
      }
      const levelId = await this.matchLookup(m, LevelEntity, b.assessment.level);
      if (b.assessment.level && !levelId) {
        warnings.push(`Түвшин "${b.assessment.level.name}" энэ орчинд алга — түвшингүй үүслээ.`);
      }

      const assessmentFormuleId = await newFormula(b.assessment.formule);
      const assessmentId = await insertOne(AssessmentEntity, {
        ...pick(AssessmentEntity, b.assessment.fields, 'assessment'),
        name,
        status: AssessmentStatus.ARCHIVE,
        formule: assessmentFormuleId,
        createdUser: userId,
        updatedUser: null,
        category: categoryId ? { id: categoryId } : null,
        level: levelId ? { id: levelId } : null,
      });

      // --- хариултын ангилал (эцэг нь түрүүлж)
      const acMap = new Map<number, number>();
      for (const r of orderByParent(b.answerCategories)) {
        const id = await insertOne(QuestionAnswerCategoryEntity, {
          ...pick(QuestionAnswerCategoryEntity, r.fields, 'questionAnswerCategory'),
          parent: r.parentRef != null ? { id: acMap.get(r.parentRef) } : null,
          assessment: { id: assessmentId },
        });
        acMap.set(r.ref, id);
      }
      const ac = (ref: number | null) => (ref != null && acMap.has(ref) ? { id: acMap.get(ref) } : null);

      // --- асуултын бүлэг
      const qcIds = await insertMany(
        QuestionCategoryEntity,
        b.questionCategories.map((r) => ({
          ...pick(QuestionCategoryEntity, r.fields, 'questionCategory'),
          assessment: { id: assessmentId },
          createdUser: userId,
          updatedUser: null,
        })),
      );
      const qcMap = new Map(b.questionCategories.map((r, i) => [r.ref, qcIds[i]]));

      // --- асуулт
      const qIds = await insertMany(
        QuestionEntity,
        b.questions.map((r) => ({
          ...pick(QuestionEntity, r.fields, 'question'),
          category: { id: qcMap.get(r.categoryRef) },
          createdUser: userId,
          updatedUser: null,
        })),
      );
      const qMap = new Map(b.questions.map((r, i) => [r.ref, qIds[i]]));

      // --- хариулт
      const aIds = await insertMany(
        QuestionAnswerEntity,
        b.answers.map((r) => ({
          ...pick(QuestionAnswerEntity, r.fields, 'questionAnswer'),
          question: { id: qMap.get(r.questionRef) },
          category: ac(r.categoryRef),
        })),
      );
      const aMap = new Map(b.answers.map((r, i) => [r.ref, aIds[i]]));

      // --- матриц
      const mIds = await insertMany(
        QuestionAnswerMatrixEntity,
        b.matrix.map((r) => ({
          ...pick(QuestionAnswerMatrixEntity, r.fields, 'questionAnswerMatrix'),
          question: r.questionRef != null ? { id: qMap.get(r.questionRef) } : null,
          answer: r.answerRef != null ? { id: aMap.get(r.answerRef) } : null,
          category: ac(r.categoryRef),
        })),
      );
      const mMap = new Map(b.matrix.map((r, i) => [r.ref, mIds[i]]));

      // --- assessment_formulas (эцэг нь түрүүлж) + тус бүрийн formule-ийн шинэ хуулбар
      const afMap = new Map<number, number>();
      for (const r of orderByParent(b.assessmentFormulas)) {
        const fId = await newFormula(r.formule);
        const id = await insertOne(AssessmentFormulaEntity, {
          ...pick(AssessmentFormulaEntity, r.fields, 'assessment_formulas'),
          assessment: { id: assessmentId },
          parent: r.parentRef != null ? { id: afMap.get(r.parentRef) } : null,
          question_category: r.questionCategoryRef != null ? { id: qcMap.get(r.questionCategoryRef) } : null,
          formule: fId ? { id: fId } : null,
        });
        afMap.set(r.ref, id);
      }

      // --- skip-дүрэм
      let rulesSkipped = 0;
      const ruleRows: Fields[] = [];
      for (const r of b.rules) {
        const target = qMap.get(r.targetQuestionRef);
        const dependsOn = qMap.get(r.dependsOnQuestionRef);
        const dependsOnAnswer = r.dependsOnAnswerRef != null ? aMap.get(r.dependsOnAnswerRef) : null;
        const dependsOnMatrix = r.dependsOnMatrixRef != null ? mMap.get(r.dependsOnMatrixRef) : null;
        const targetAnswer = r.targetAnswerRef != null ? aMap.get(r.targetAnswerRef) : null;
        if (
          !target ||
          !dependsOn ||
          (r.dependsOnAnswerRef != null && !dependsOnAnswer) ||
          (r.dependsOnMatrixRef != null && !dependsOnMatrix) ||
          (r.targetAnswerRef != null && !targetAnswer)
        ) {
          rulesSkipped++;
          continue;
        }
        ruleRows.push({
          ...pick(QuestionRuleEntity, r.fields, 'questionRule'),
          targetQuestionId: target,
          dependsOnQuestionId: dependsOn,
          dependsOnAnswerId: dependsOnAnswer,
          dependsOnMatrixId: dependsOnMatrix,
          targetAnswerId: targetAnswer,
        });
      }
      await insertMany(QuestionRuleEntity, ruleRows);
      if (rulesSkipped) warnings.push(`Өөр тестийн асуулт заасан ${rulesSkipped} skip-дүрмийг алгаслаа.`);

      // --- Studio загвар, хувьсагч, AI дата — {{question[<id>]}} token-уудыг шинэ ID руу
      const unknownQ = new Set<number>();
      const remap = (fields: Fields) => remapQuestionTokens(fields, qMap, unknownQ);
      for (const t of b.pdfTemplates) {
        await insertOne(PdfTemplateEntity, {
          ...pick(PdfTemplateEntity, remap(t.fields), 'pdf_template'),
          assessmentId,
        });
      }
      for (const v of b.variables) {
        await insertOne(AssessmentVariableEntity, {
          ...pick(AssessmentVariableEntity, remap(v.fields), 'assessment_variable'),
          assessmentId,
        });
      }
      if (b.aiData) {
        await insertOne(AssessmentAiDataEntity, {
          ...pick(AssessmentAiDataEntity, remap(b.aiData.fields), 'assessment_ai_data'),
          assessmentId,
        });
      }
      if (unknownQ.size) {
        warnings.push(
          `Studio загвар/хувьсагчид энэ тестэд байхгүй асуулт заасан token үлдлээ: ${[...unknownQ].slice(0, 10).map((id) => `question[${id}]`).join(', ')}`,
        );
      }
      return { id: assessmentId, name };
    });

    if (dropped.size) {
      warnings.push(`Энэ серверт байхгүй ${dropped.size} талбарыг алгаслаа (хувилбар зөрүү): ${[...dropped].slice(0, 15).join(', ')}`);
    }
    // Admin / web хариултыг mv_question_answer_full-аас уншдаг. Хуулбар руу шилжмэгц
    // хариулт харагдахын тулд хариу буцаахаас ӨМНӨ харагдацыг шинэчилнэ (өмнө нь
    // debounce-тэй fire-and-forget байсан тул admin шинэ тест рүү шууд ороход хариултгүй
    // харагддаг байсан).
    await this.refreshAnswerView(warnings);
    this.logger.log(
      `assessment ${mode}: "${b.source?.name}" (src id=${b.source?.assessmentId}) → id=${created.id} "${created.name}" by user ${userId}`,
    );
    return {
      id: created.id,
      name: created.name,
      status: AssessmentStatus.ARCHIVE,
      stats: bundleStats(b),
      files: fileRes,
      warnings,
    };
  }

  /** Нэг орчин дотор хувилах — шинэ assessment-ийн ID-г буцаана (хуучин question/copy/:id-тэй нийцтэй). */
  async copy(assessmentId: number, userId: number): Promise<number> {
    const bundle = await this.exportBundle(assessmentId, { includeFiles: false });
    const res = await this.importBundle(bundle, userId, { mode: 'copy', skipFiles: true });
    return res.id;
  }

  // =========================================================================
  // туслах
  // =========================================================================

  private async refreshAnswerView(warnings: string[]) {
    try {
      await this.ds.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_question_answer_full');
      return;
    } catch {
      /* CONCURRENTLY нь харагдац хоосон / unique index-гүй үед унадаг — энгийнээр давтана */
    }
    try {
      await this.ds.query('REFRESH MATERIALIZED VIEW mv_question_answer_full');
    } catch (e: any) {
      this.logger.error(`mv_question_answer_full refresh failed: ${e?.message}`);
      this.view.refresh();
      warnings.push('Хариултын жагсаалт шинэчлэгдэхгүй байна — хэдэн секундийн дараа хуудсаа дахин ачаална уу.');
    }
  }

  private async runTx<T>(fn: (m: EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.ds.transaction(fn);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`assessment import rolled back: ${e?.message}`, e?.stack);
      throw new BadRequestException(
        `Тест оруулахад алдаа гарлаа — юу ч хадгалагдаагүй: ${e?.driverError?.message ?? e?.message ?? e}`,
      );
    }
  }

  /** Entity-ийн энгийн (relation биш, PK / огноо биш) баганууд → { propertyName: утга } */
  private scalarFields(entity: EntityTarget<any>, row: any, extraSkip: Set<string>): Fields {
    const out: Fields = {};
    for (const c of this.ds.getMetadata(entity).columns) {
      if (c.isPrimary || c.isCreateDate || c.isUpdateDate || c.isVersion || c.isDeleteDate) continue;
      if (c.relationMetadata || c.isVirtual) continue;
      if (SKIP_FIELDS.has(c.propertyName) || extraSkip.has(c.propertyName)) continue;
      const v = row?.[c.propertyName];
      if (v !== undefined) out[c.propertyName] = v;
    }
    return out;
  }

  /** Bundle-ийн талбаруудаас ЭНЭ серверийн entity-д байгааг л авна (хувилбар зөрүүнд тэсвэртэй). */
  private pickKnown(
    entity: EntityTarget<any>,
    fields: Fields,
    label: string,
    dropped: Set<string>,
  ): Fields {
    const known = new Set(
      this.ds
        .getMetadata(entity)
        .columns.filter(
          (c) =>
            !c.isPrimary &&
            !c.isCreateDate &&
            !c.isUpdateDate &&
            !c.relationMetadata &&
            !SKIP_FIELDS.has(c.propertyName),
        )
        .map((c) => c.propertyName),
    );
    const out: Fields = {};
    for (const [k, v] of Object.entries(fields ?? {})) {
      if (known.has(k)) out[k] = v;
      else if (!SKIP_FIELDS.has(k)) dropped.add(`${label}.${k}`);
    }
    return out;
  }

  private async freeName(m: EntityManager, base: string, mode: 'import' | 'copy'): Promise<string> {
    const repo = m.getRepository(AssessmentEntity);
    for (const candidate of nameCandidates(base, mode)) {
      if (!(await repo.count({ where: { name: candidate } }))) return candidate;
    }
    return `${String(base).trim()} (${mode} ${Date.now()})`;
  }

  private async matchLookup(
    m: EntityManager,
    entity: typeof AssessmentCategoryEntity | typeof LevelEntity,
    ref: { id: number; name: string } | null,
  ): Promise<number | null> {
    if (!ref) return null;
    const repo = m.getRepository<any>(entity);
    const byId = ref.id ? await repo.findOne({ where: { id: ref.id } }) : null;
    if (byId && String(byId.name).trim() === String(ref.name).trim()) return byId.id;
    const byName = ref.name ? await repo.findOne({ where: { name: ref.name } }) : null;
    return byName?.id ?? null;
  }
}
