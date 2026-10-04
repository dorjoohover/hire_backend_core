import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import axios from 'axios';
import { DataSource } from 'typeorm';
import { REPORT_STATUS } from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';

/*
 * v1.3.0 тайлангийн pipeline (REPORT_PIPELINE=v2).
 *
 *   exam дуусах → enqueueCalc(): report_logs мөр (id = v2-<code>, PENDING) + core-ийн Redis дээрх
 *   `report-calc` queue (jobId = calc-<code> → давхар дуусгахад давхар бодогдохгүй) →
 *   hire_report calc service (core VPS, DB-тэй нэг host) тооцоолж snapshot-той render job-ыг
 *   report VPS руу илгээнэ → render worker DB-гүйгээр зурж, төлөвийг PATCH /report/internal/status.
 *
 * Эрэмбэ: хэрэглэгч дуусгасан → priority-гүй (хамгийн өндөр); ops / sweep → 10.
 * Sweep (5 мин тутам): гацсан (15 мин+) эсвэл FAILED v2 мөрийг 3 хүртэл удаа дахин оруулна.
 * REPORT_PIPELINE тавиагүй бол юу ч өөрчлөгдөхгүй (хуучин HTTP урсгал).
 */
export const CALC_QUEUE = 'report-calc';
export const SWEEP_QUEUE = 'report-sweep';
export const OPS_PRIORITY = 10;

const INFLIGHT = ['PENDING', 'STARTED', 'CALCULATING', 'WRITING', 'UPLOADING'];
const STATUS_VALUES = new Set<string>(Object.values(REPORT_STATUS));
const SWEEP_EVERY_MS = Number(process.env.REPORT_SWEEP_EVERY_MS ?? 5 * 60 * 1000);
const SWEEP_STUCK_MIN = Number(process.env.REPORT_SWEEP_STUCK_MIN ?? 15);
const SWEEP_MAX = Number(process.env.REPORT_SWEEP_MAX ?? 3);

export interface EnqueueCalcInput {
  code: string;
  role?: number;
  examFinishedAt?: number;
  priority?: number;
  recalculate?: boolean;
  notify?: boolean;
  /** sweep-ээс дахин оруулахад тоолуурыг хадгална. */
  resetSweeps?: boolean;
}

export interface StatusPatchInput {
  logId?: string;
  code?: string;
  status?: string;
  progress?: number;
  error?: string | null;
  timings?: Record<string, number>;
}

@Injectable()
export class ReportPipelineService implements OnModuleInit {
  private readonly log = new Logger('ReportPipeline');

  constructor(
    private readonly ds: DataSource,
    @InjectQueue(CALC_QUEUE) private readonly calcQueue: Queue,
    @InjectQueue(SWEEP_QUEUE) private readonly sweepQueue: Queue,
  ) {}

  enabled(): boolean {
    return (process.env.REPORT_PIPELINE ?? '').trim().toLowerCase() === 'v2';
  }

  logId(code: string): string {
    return `v2-${code}`;
  }

  async onModuleInit() {
    if (!this.enabled() || process.env.REPORT_SWEEP === 'off') return;
    try {
      // Idempotent — 4 core replica бүгд дуудсан ч НЭГ scheduler.
      await this.sweepQueue.upsertJobScheduler(
        'report-sweep',
        { every: SWEEP_EVERY_MS },
        { name: 'sweep', data: {}, opts: { removeOnComplete: true, removeOnFail: 50 } },
      );
    } catch (e: any) {
      this.log.warn(`sweep scheduler бүртгэж чадсангүй: ${e?.message ?? e}`);
    }
  }

  async enqueueCalc(input: EnqueueCalcInput) {
    const code = String(input.code ?? '').trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(code)) throw new BadRequestException('Буруу код');
    const role = input.role ?? Role.admin;
    const logId = this.logId(code);
    await this.ds.query(
      `INSERT INTO report_logs (id, code, role, status, progress, error, pipeline, sweeps, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'PENDING', 0, NULL, 'v2', 0, now(), now())
       ON CONFLICT (id) DO UPDATE SET
         status = 'PENDING', progress = 0, error = NULL, timings = NULL, role = EXCLUDED.role,
         sweeps = CASE WHEN $4 THEN 0 ELSE report_logs.sweeps END, "updatedAt" = now()`,
      [logId, code, role, input.resetSweeps !== false],
    );

    const jobId = `calc-${code}`;
    const existing = await this.calcQueue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (state === 'completed' || state === 'failed' || state === 'unknown') {
        await existing.remove().catch(() => undefined);
      } else {
        return { logId, jobId, queued: false, state };
      }
    }
    await this.calcQueue.add(
      'calc',
      {
        code,
        role,
        logId,
        examFinishedAt: input.examFinishedAt ?? Date.now(),
        recalculate: !!input.recalculate,
        notify: !!input.notify,
        priority: input.priority ?? null,
      },
      {
        jobId,
        ...(input.priority ? { priority: input.priority } : {}),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: 500,
      },
    );
    return { logId, jobId, queued: true };
  }

  /** hire_report render worker (DB-гүй) → report_logs. timings нь merge хийгдэнэ. */
  async patchStatus(p: StatusPatchInput) {
    if (p.status != null && !STATUS_VALUES.has(p.status)) {
      throw new BadRequestException(`Буруу төлөв: ${p.status}`);
    }
    const progress =
      p.progress == null ? null : Math.max(0, Math.min(100, Math.round(Number(p.progress))));
    const timings = sanitizeTimings(p.timings);
    const id = p.logId || (p.code ? this.logId(p.code) : null);
    if (!id) throw new BadRequestException('logId эсвэл code шаардлагатай');
    const res = await this.ds.query(
      `UPDATE report_logs SET
         status = COALESCE($2, status),
         progress = COALESCE($3, progress),
         error = CASE WHEN $4::text = '__keep__' THEN error ELSE $4 END,
         timings = COALESCE(timings, '{}'::jsonb) || $5::jsonb,
         "updatedAt" = now()
       WHERE id = $1`,
      [
        id,
        p.status ?? null,
        progress,
        p.error === undefined ? '__keep__' : p.error == null ? null : String(p.error).slice(0, 500),
        JSON.stringify(timings),
      ],
    );
    const affected = Array.isArray(res) ? Number(res[1] ?? 0) : 0;
    return { ok: true, affected };
  }

  /** render worker-ийн snapshot miss → calc service (core VPS-ийн дотоод сүлжээ). */
  async proxyData(body: { name?: string; args?: unknown[] }) {
    const base = process.env.REPORT_CALC_URL;
    if (!base) throw new ServiceUnavailableException('REPORT_CALC_URL тохируулаагүй');
    if (!body?.name || typeof body.name !== 'string') throw new BadRequestException('name');
    const res = await axios.post(
      `${base.replace(/\/+$/, '')}/internal/report-data`,
      { name: body.name, args: Array.isArray(body.args) ? body.args : [] },
      {
        headers: process.env.INTERNAL_API_KEY ? { 'x-internal-key': process.env.INTERNAL_API_KEY } : {},
        timeout: 25_000,
      },
    );
    return res.data;
  }

  /** Гацсан / FAILED v2 тайлангуудыг дахин оруулах (5 мин тутам). */
  async sweep(): Promise<{ requeued: number }> {
    if (!this.enabled()) return { requeued: 0 };
    const rows: { id: string; code: string; role: number; status: string; sweeps: number }[] =
      await this.ds.query(
        `SELECT id, code, role, status, sweeps FROM report_logs
          WHERE pipeline = 'v2' AND sweeps < $1 AND (
            (status::text = ANY($2) AND "updatedAt" < now() - make_interval(mins => $3))
            OR (status::text = 'FAILED' AND "updatedAt" < now() - interval '5 minutes'))
          ORDER BY "updatedAt" ASC LIMIT 20`,
        [SWEEP_MAX, INFLIGHT, SWEEP_STUCK_MIN],
      );
    let requeued = 0;
    for (const r of rows) {
      try {
        await this.ds.query(`UPDATE report_logs SET sweeps = sweeps + 1 WHERE id = $1`, [r.id]);
        await this.enqueueCalc({
          code: r.code,
          role: r.role,
          priority: OPS_PRIORITY,
          resetSweeps: false,
        });
        requeued++;
        this.log.warn(`sweep: ${r.code} (${r.status}, ${r.sweeps + 1}/${SWEEP_MAX}) дахин оруулав`);
      } catch (e: any) {
        this.log.error(`sweep ${r.code}: ${e?.message ?? e}`);
      }
    }
    return { requeued };
  }
}

/** Зөвхөн тоон утгатай, богино түлхүүртэй timings (≤ 40 түлхүүр). */
export function sanitizeTimings(t?: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!t || typeof t !== 'object') return out;
  for (const [k, v] of Object.entries(t).slice(0, 40)) {
    if (/^[a-z0-9_]{1,40}$/.test(k) && typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v);
  }
  return out;
}

export { INFLIGHT };
