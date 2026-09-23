import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { createHash } from 'crypto';
import { DataSource } from 'typeorm';
import { REPORT_STATUS } from 'src/base/constants';
import { ReportLogDao } from '../report/report.log.dao';

export type OpsActor = { id?: number; email?: string; ip?: string };
export type OpsMode = 'recalculate' | 'regenerate' | 'retry';

export const OPS_CODE_RE = /^\d{6,20}$/;
export const OPS_MAX_PDF_BYTES = 20 * 1024 * 1024;
// report_logs мөр энэ хугацаанаас удаан шинэчлэгдээгүй бол "гацсан" гэж үзнэ
// (hire_report-ийн AppService.STALE_MS-тэй ижил).
export const OPS_STALE_MS = 10 * 60 * 1000;

const INFLIGHT: string[] = [
  REPORT_STATUS.STARTED,
  REPORT_STATUS.WRITING,
  REPORT_STATUS.CALCULATING,
  REPORT_STATUS.UPLOADING,
];

/**
 * №14 — тайлангийн ops үйлдлүүд (recalculate / regenerate / retry / PDF гараар
 * солих). Урьд нь `GET /exam/recalculate|regenerate/:code` (GET-ээр мутаци) байсан.
 * Үйлдэл бүр `ops_action_log`-д (хэн, юу, ямар код, үр дүн) бүртгэгдэнэ.
 */
@Injectable()
export class OpsService {
  constructor(
    private readonly ds: DataSource,
    private readonly reportLog: ReportLogDao,
  ) {}

  private reportBase(): string {
    const b = process.env.REPORT;
    if (!b) throw new ServiceUnavailableException('REPORT env тохируулаагүй');
    return b.endsWith('/') ? b : `${b}/`;
  }

  assertCode(code: string) {
    if (!OPS_CODE_RE.test(code ?? '')) {
      throw new BadRequestException('Код нь 6–20 оронтой тоо байх ёстой');
    }
  }

  async examExists(code: string): Promise<boolean> {
    const rows = await this.ds.query(
      'SELECT id FROM exam WHERE code = $1 LIMIT 1',
      [code],
    );
    return rows.length > 0;
  }

  async latestLog(code: string) {
    const rows = await this.ds.query(
      `SELECT id, code, status, progress, role, error, "createdAt", "updatedAt"
       FROM report_logs WHERE code = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [code],
    );
    return rows[0] ?? null;
  }

  private async fileInfo(code: string) {
    try {
      const res = await axios.get(
        `${this.reportBase()}file/report-${code}.pdf`,
        {
          responseType: 'stream',
          timeout: 10_000,
          validateStatus: () => true,
        },
      );
      const size = Number(res.headers['content-length'] ?? 0) || null;
      res.data?.destroy?.();
      return { exists: res.status === 200, size, status: res.status };
    } catch (e: any) {
      return { exists: null, size: null, error: e?.message };
    }
  }

  async status(code: string) {
    this.assertCode(code);
    const [exam, log, resultRows, file] = await Promise.all([
      this.examExists(code),
      this.latestLog(code),
      this.ds.query('SELECT count(*)::int AS n FROM result WHERE code = $1', [
        code,
      ]),
      this.fileInfo(code),
    ]);
    return { code, exam, log, resultRows: resultRows[0]?.n ?? 0, file };
  }

  /** Нэг actor минутад хэдэн ops үйлдэл хийж болох (default 20). */
  private async throttle(actor: OpsActor) {
    if (!actor?.id) return;
    const limit = Number(process.env.OPS_RATE_PER_MIN ?? 20);
    const rows = await this.ds.query(
      `SELECT count(*)::int AS n FROM ops_action_log
       WHERE "actorId" = $1 AND "createdAt" > now() - interval '1 minute'`,
      [actor.id],
    );
    if ((rows[0]?.n ?? 0) >= limit) {
      throw new HttpException(
        'Хэт олон ops үйлдэл — 1 минут хүлээнэ үү',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async audit(
    actor: OpsActor,
    action: string,
    code: string | null,
    status: 'ok' | 'failed',
    detail?: any,
  ) {
    try {
      await this.ds.query(
        `INSERT INTO ops_action_log ("actorId", "actorEmail", action, code, status, detail, ip)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          actor?.id ?? null,
          actor?.email ?? null,
          action,
          code,
          status,
          detail === undefined
            ? null
            : String(
                typeof detail === 'string' ? detail : JSON.stringify(detail),
              ).slice(0, 1000),
          actor?.ip ?? null,
        ],
      );
    } catch (e: any) {
      // Аудит бичигдэхгүй байсан ч үйлдлийг унагахгүй, зөвхөн лог.
      console.error('⚠️ ops_action_log бичихэд алдаа:', e?.message);
    }
  }

  async recent(code?: string, limit = 50) {
    const n = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.ds.query(
      `SELECT id, "actorId", "actorEmail", action, code, status, detail, ip, "createdAt"
       FROM ops_action_log
       WHERE ($1::varchar IS NULL OR code = $1)
       ORDER BY id DESC LIMIT ${n}`,
      [code ?? null],
    );
  }

  /** recalculate / regenerate / retry — hire_report-т force-той job оруулна. */
  async trigger(
    actor: OpsActor,
    code: string,
    mode: OpsMode,
    opts: { notify?: boolean } = {},
  ) {
    this.assertCode(code);
    if (!(await this.examExists(code))) {
      throw new NotFoundException('Ийм кодтой шалгалт олдсонгүй');
    }
    await this.throttle(actor);

    const log = await this.latestLog(code);
    if (mode === 'retry' && log?.status !== REPORT_STATUS.FAILED) {
      throw new ConflictException(
        `retry зөвхөн FAILED тайланд (одоо: ${log?.status ?? 'мөр байхгүй'}). Дахин үүсгэх бол regenerate / recalculate`,
      );
    }
    const fresh =
      log && Date.now() - new Date(log.updatedAt).getTime() < OPS_STALE_MS;
    if (log && INFLIGHT.includes(log.status) && fresh) {
      throw new ConflictException(
        `Тайлан одоо боловсруулагдаж байна (${log.status}); дууссаны дараа дахин оролдоно уу`,
      );
    }

    try {
      const res = await axios.post(
        this.reportBase(),
        {
          code,
          ...(log?.role ? { role: log.role } : {}),
          force: mode !== 'retry',
          recalculate: mode === 'recalculate',
          ...(opts.notify ? { notify: true } : {}),
        },
        { timeout: 15_000 },
      );
      await this.audit(actor, `report.${mode}`, code, 'ok', {
        prev: log?.status ?? null,
        ...res.data,
      });
      return { code, mode, queued: true, ...res.data };
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message ?? err?.message;
      await this.audit(actor, `report.${mode}`, code, 'failed', {
        status,
        msg,
      });
      if (status === 409) throw new ConflictException(msg);
      throw new BadGatewayException(
        `hire_report руу хүсэлт амжилтгүй (${status ?? 'холбогдсонгүй'}): ${msg}`,
      );
    }
  }

  /** PDF-ийг гараар солих: core-д шалгаад hire_report `PUT /internal/files/:name` руу дамжуулна. */
  async uploadPdf(
    actor: OpsActor,
    code: string,
    file: { buffer: Buffer; size?: number } | undefined,
    sha256?: string,
  ) {
    this.assertCode(code);
    if (!file?.buffer?.length) throw new BadRequestException('file шаардлагатай');
    const buf = file.buffer;
    if (buf.length > OPS_MAX_PDF_BYTES) {
      throw new HttpException('PDF 20MB-с их байна', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    if (buf.length < 200 || buf.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new BadRequestException('Энэ нь PDF биш байна (%PDF- header)');
    }
    if (
      !buf
        .subarray(Math.max(0, buf.length - 1024))
        .toString('latin1')
        .includes('%%EOF')
    ) {
      throw new BadRequestException('PDF төгсгөл (%%EOF) олдсонгүй — тасарсан файл');
    }
    const actual = createHash('sha256').update(buf).digest('hex');
    if (sha256 && sha256.toLowerCase() !== actual) {
      throw new BadRequestException('sha256 таарсангүй');
    }
    const key = process.env.INTERNAL_API_KEY;
    if (!key) {
      throw new ServiceUnavailableException('INTERNAL_API_KEY тохируулаагүй');
    }
    if (!(await this.examExists(code))) {
      throw new NotFoundException('Ийм кодтой шалгалт олдсонгүй');
    }
    await this.throttle(actor);

    const name = `report-${code}.pdf`;
    let put: any;
    try {
      const res = await axios.put(`${this.reportBase()}internal/files/${name}`, buf, {
        headers: {
          'Content-Type': 'application/pdf',
          'x-internal-key': key,
          'x-content-sha256': actual,
        },
        maxBodyLength: OPS_MAX_PDF_BYTES + 1024,
        maxContentLength: 1024 * 1024,
        timeout: 60_000,
      });
      put = res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message ?? err?.message;
      await this.audit(actor, 'report.pdf.upload', code, 'failed', { status, msg });
      throw new BadGatewayException(
        `hire_report PDF хүлээж авсангүй (${status ?? 'холбогдсонгүй'}): ${msg}`,
      );
    }

    // report_logs: SENT бол SENT хэвээр (мэйл дахин явахгүй), бусад нь COMPLETED
    // болж core-ийн `status` polling мэйлийг нэг удаа илгээнэ.
    const log = await this.latestLog(code);
    if (log) {
      await this.reportLog.updateById(log.id, {
        status:
          log.status === REPORT_STATUS.SENT
            ? REPORT_STATUS.SENT
            : REPORT_STATUS.COMPLETED,
        progress: 100,
        error: null as any,
      });
    } else {
      await this.reportLog.create({
        id: `ops-manual-${code}-${Date.now()}`,
        code,
        role: 40,
        status: REPORT_STATUS.COMPLETED,
        progress: 100,
      });
    }
    await this.audit(actor, 'report.pdf.upload', code, 'ok', {
      size: buf.length,
      sha256: actual,
      replaced: put?.replaced ?? null,
      prev: log?.status ?? null,
    });
    return { code, name, size: buf.length, sha256: actual, replaced: !!put?.replaced };
  }
}
