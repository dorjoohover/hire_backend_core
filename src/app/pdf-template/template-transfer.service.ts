import { BadRequestException, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, EntityTarget } from 'typeorm';
import * as mime from 'mime-types';
import { PdfTemplateEntity } from './entities/pdf-template.entity';
import { AssessmentVariableEntity } from './entities/assessment-variable.entity';
import { FileService } from 'src/file.service';
import {
  BLOCKED_FILE_EXT,
  Fields,
  fileKeysInText,
  remapQuestionTokens,
  remapWheelAxisIds,
} from '../assessment-transfer/assessment-bundle';
import {
  AnswerCategorySig,
  QuestionSig,
  TEMPLATE_BUNDLE_FORMAT,
  TEMPLATE_BUNDLE_VERSION,
  TemplateBundle,
  assertTemplateBundle,
  matchAnswerCategories,
  matchQuestions,
  questionIdsIn,
  questionSigs,
  templateNameCandidates,
} from '../assessment-transfer/template-bundle';

export type VariableMode = 'upsert' | 'missing' | 'none';

export interface TemplateImportResult {
  id: number;
  name: string;
  assessmentId: number;
  activated: boolean;
  questions: {
    referenced: number;
    matched: number;
    how: Record<'name' | 'text' | 'position', number>;
    unmatched: { id: number; name: string; categoryName: string }[];
  };
  variables: { created: number; updated: number; skipped: number };
  files: { written: number; existing: number; skipped: string[] };
  warnings: string[];
}

// Эх орчны мөрийн ID / огноо / хэрэглэгч — шинэ орчинд утгагүй.
const SKIP = new Set(['id', 'assessmentId', 'isActive', 'createdAt', 'updatedAt', 'createdUser', 'updatedUser']);

/**
 * Studio загварыг (pdf_template) ДАНГААР нь орчин хооронд зөөх (template-bundle.ts).
 * Тест өөрөө хоёр орчинд аль хэдийн байх ёстой — асуултын ID-г гарын үсгээр нь хөрвүүлнэ.
 */
@Injectable()
export class TemplateTransferService {
  private readonly logger = new Logger(TemplateTransferService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly files: FileService,
  ) {}

  // =========================================================================
  // EXPORT
  // =========================================================================
  async exportTemplate(templateId: number, opts: { includeFiles?: boolean } = {}): Promise<TemplateBundle> {
    const t = await this.ds.getRepository(PdfTemplateEntity).findOne({ where: { id: templateId } });
    if (!t) throw new NotFoundException('Загвар олдсонгүй.');
    const assessmentId = t.assessmentId ?? null;
    const assessment = assessmentId
      ? (await this.ds.query(`SELECT id, name FROM assessment WHERE id = $1`, [assessmentId]))[0]
      : null;
    const variables = assessmentId
      ? await this.ds.getRepository(AssessmentVariableEntity).find({ where: { assessmentId }, order: { id: 'ASC' } })
      : [];

    const templateFields = this.fields(PdfTemplateEntity, t);
    const variableFields = variables.map((v) => this.fields(AssessmentVariableEntity, v));
    const ids = questionIdsIn([templateFields, variableFields]);
    const allQuestions = assessmentId ? await this.questionSigs(assessmentId) : [];
    const bundle: TemplateBundle = {
      format: TEMPLATE_BUNDLE_FORMAT,
      version: TEMPLATE_BUNDLE_VERSION,
      exportedAt: new Date().toISOString(),
      source: {
        templateId: t.id!,
        templateName: t.name,
        assessmentId,
        assessmentName: assessment?.name ?? null,
      },
      template: { fields: templateFields },
      variables: variableFields.map((fields) => ({ fields })),
      questions: allQuestions.filter((q) => ids.has(q.id)),
      answerCategories: assessmentId ? await this.answerCategorySigs(assessmentId) : [],
      files: [],
      missingFiles: [],
    };
    if (opts.includeFiles !== false) {
      const keys = new Set<string>();
      fileKeysInText(JSON.stringify(templateFields), keys);
      fileKeysInText(JSON.stringify(variableFields), keys);
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

  // =========================================================================
  // IMPORT
  // =========================================================================
  async importTemplate(body: any): Promise<TemplateImportResult> {
    const input = body?.bundle;
    try {
      assertTemplateBundle(input);
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Файл буруу байна.');
    }
    const b = input as TemplateBundle;
    const assessmentId = Number(body?.assessmentId);
    if (!Number.isInteger(assessmentId) || assessmentId <= 0) throw new BadRequestException('Тест сонгоно уу.');
    const target = (await this.ds.query(`SELECT id, name FROM assessment WHERE id = $1`, [assessmentId]))[0];
    if (!target) throw new NotFoundException('Сонгосон тест энэ орчинд олдсонгүй.');
    const activate = body?.activate === true;
    const varMode: VariableMode = ['upsert', 'missing', 'none'].includes(body?.variables) ? body.variables : 'upsert';
    const warnings: string[] = [];

    // 1) Асуулт / хариултын ангиллыг тааруулах
    const qm = matchQuestions(b.questions, await this.questionSigs(assessmentId));
    const acMap = matchAnswerCategories(b.answerCategories, await this.answerCategorySigs(assessmentId));
    const unknownQ = new Set<number>();
    const remap = <T>(v: T): T => remapWheelAxisIds(remapQuestionTokens(v, qm.map, unknownQ), acMap);
    if (qm.unmatched.length) {
      warnings.push(
        `${qm.unmatched.length} асуулт энэ тестэд олдсонгүй — тэдгээрийн {{question[…]}} token хоосон гарна: ` +
          qm.unmatched
            .slice(0, 5)
            .map((q) => `#${q.id} "${q.name.replace(/<[^>]*>/g, '').slice(0, 40)}"`)
            .join(', ') +
          (qm.unmatched.length > 5 ? '…' : ''),
      );
    }
    if (qm.how.position) {
      warnings.push(`${qm.how.position} асуултыг текстээр биш БАЙРЛАЛААР (бүлэг, дугаар) тааруулсан — шалгана уу.`);
    }
    if (b.source.assessmentName && target.name && b.source.assessmentName.trim() !== String(target.name).trim()) {
      warnings.push(`Эх тест "${b.source.assessmentName}", зорилтот тест "${target.name}" — нэр өөр.`);
    }

    // 2) Зургууд — transaction-аас өмнө (ижил түлхүүрээр; байгаа бол алгасна)
    const fileRes = { written: 0, existing: 0, skipped: [] as string[] };
    for (const f of b.files) {
      if (BLOCKED_FILE_EXT.test(f.key)) {
        fileRes.skipped.push(f.key);
        continue;
      }
      if (await this.files.exists(f.key)) {
        fileRes.existing++;
        continue;
      }
      await this.files.upload(f.key, f.contentType || 'application/octet-stream', Buffer.from(f.base64, 'base64'), {
        purpose: 'studio-image',
      });
      fileRes.written++;
    }
    if (b.missingFiles.length) {
      warnings.push(`Эх орчинд олдоогүй ${b.missingFiles.length} зураг энд ч харагдахгүй: ${b.missingFiles.slice(0, 5).join(', ')}`);
    }

    // 3) DB — нэг transaction
    const varRes = { created: 0, updated: 0, skipped: 0 };
    const created = await this.runTx(async (m) => {
      const tRepo = m.getRepository(PdfTemplateEntity);
      let name = templateNameCandidates(b.template.fields.name)[0];
      for (const c of templateNameCandidates(b.template.fields.name)) {
        if (!(await tRepo.count({ where: { assessmentId, name: c } }))) {
          name = c;
          break;
        }
      }
      const fields = this.known(PdfTemplateEntity, remap(b.template.fields), warnings, 'pdf_template');
      const saved = await tRepo.save(tRepo.create({ ...fields, name, assessmentId, isActive: false } as PdfTemplateEntity));
      if (activate) {
        await tRepo.update({ assessmentId }, { isActive: false });
        await tRepo.update({ id: saved.id }, { isActive: true });
      }
      if (varMode !== 'none') {
        const vRepo = m.getRepository(AssessmentVariableEntity);
        for (const v of b.variables) {
          const vf = this.known(AssessmentVariableEntity, remap(v.fields), warnings, 'assessment_variable');
          const key = String(vf.key).trim();
          const existing = await vRepo.findOne({ where: { assessmentId, key } });
          if (existing && varMode === 'missing') {
            varRes.skipped++;
            continue;
          }
          if (existing) {
            await vRepo.update({ id: existing.id }, { ...vf, key });
            varRes.updated++;
          } else {
            await vRepo.save(vRepo.create({ ...vf, key, assessmentId } as AssessmentVariableEntity));
            varRes.created++;
          }
        }
      }
      return saved;
    });
    if (unknownQ.size) {
      const extra = [...unknownQ].filter((id) => !qm.unmatched.some((q) => q.id === id));
      if (extra.length) warnings.push(`Эх тестэд ч байгаагүй асуултын ID (хэвээр үлдсэн): ${extra.slice(0, 10).join(', ')}`);
    }
    this.logger.log(
      `template import: "${b.source.templateName}" (#${b.source.templateId}) → assessment ${assessmentId} as #${created.id}` +
        ` (questions ${qm.map.size}/${b.questions.length}, vars +${varRes.created}/~${varRes.updated})`,
    );
    return {
      id: created.id!,
      name: created.name,
      assessmentId,
      activated: activate,
      questions: {
        referenced: b.questions.length,
        matched: qm.map.size,
        how: qm.how,
        unmatched: qm.unmatched.map((q) => ({ id: q.id, name: q.name, categoryName: q.categoryName })),
      },
      variables: varRes,
      files: fileRes,
      warnings,
    };
  }

  // =========================================================================
  private async questionSigs(assessmentId: number): Promise<QuestionSig[]> {
    const rows = await this.ds.query(
      `SELECT q.id, q.type, q.name, c.id AS "categoryId", c.name AS "categoryName"
         FROM question q JOIN "questionCategory" c ON c.id = q."categoryId"
        WHERE c."assessmentId" = $1 AND COALESCE(q.status, 10) <> 20
        ORDER BY c."orderNumber" ASC NULLS LAST, c.id ASC, q."orderNumber" ASC NULLS LAST, q.id ASC`,
      [assessmentId],
    );
    return questionSigs(rows);
  }

  private async answerCategorySigs(assessmentId: number): Promise<AnswerCategorySig[]> {
    const rows = await this.ds.query(
      `SELECT ac.id, ac.name, p.name AS "parentName"
         FROM "questionAnswerCategory" ac LEFT JOIN "questionAnswerCategory" p ON p.id = ac."parentId"
        WHERE ac."assessmentId" = $1 ORDER BY ac.id`,
      [assessmentId],
    );
    return rows.map((r: any) => ({ id: Number(r.id), name: String(r.name ?? ''), parentName: r.parentName ?? null }));
  }

  /** Entity-ийн энгийн баганууд (ID / огноо / assessmentId / isActive-гүй). */
  private fields(entity: EntityTarget<any>, row: any): Fields {
    const out: Fields = {};
    for (const c of this.ds.getMetadata(entity).columns) {
      if (c.isPrimary || c.isCreateDate || c.isUpdateDate || c.relationMetadata || SKIP.has(c.propertyName)) continue;
      const v = row?.[c.propertyName];
      if (v !== undefined) out[c.propertyName] = v;
    }
    return out;
  }

  /** Файлын талбаруудаас ЭНЭ серверийн entity-д байгааг л авна (хувилбар зөрүүнд тэсвэртэй). */
  private known(entity: EntityTarget<any>, fields: Fields, warnings: string[], label: string): Fields {
    const cols = new Set(
      this.ds
        .getMetadata(entity)
        .columns.filter((c) => !c.isPrimary && !c.isCreateDate && !c.isUpdateDate && !c.relationMetadata && !SKIP.has(c.propertyName))
        .map((c) => c.propertyName),
    );
    const out: Fields = {};
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(fields ?? {})) {
      if (cols.has(k)) out[k] = v;
      else if (!SKIP.has(k)) dropped.push(k);
    }
    if (dropped.length) warnings.push(`Энэ серверт байхгүй талбарыг алгаслаа (${label}): ${dropped.join(', ')}`);
    return out;
  }

  private async runTx<T>(fn: (m: import('typeorm').EntityManager) => Promise<T>): Promise<T> {
    try {
      return await this.ds.transaction(fn);
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      this.logger.error(`template import rolled back: ${e?.message}`, e?.stack);
      throw new BadRequestException(
        `Загвар оруулахад алдаа гарлаа — юу ч хадгалагдаагүй: ${e?.driverError?.message ?? e?.message ?? e}`,
      );
    }
  }
}
