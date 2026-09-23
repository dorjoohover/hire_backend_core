import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { DataSource } from 'typeorm';

export const MONITOR_RANGES = {
  '1h': '1 hour',
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
} as const;
export type MonitorRange = keyof typeof MONITOR_RANGES;
export type ReportState = 'all' | 'stuck' | 'failed';

// Тайлан "гацсан" гэж үзэх босго (find-stuck-reports.sh-ийн Pattern A / B-тэй нэг тодорхойлолт):
//   A — шалгалт дууссанаас 5+ минут өнгөрсөн ч report_logs мөр огт байхгүй;
//   B — сүүлийн мөр төгсгөлийн биш (COMPLETED / SENT / FAILED биш) бөгөөд 10+ минут шинэчлэгдээгүй.
export const STUCK_A_MIN = 5;
export const STUCK_B_MIN = 10;
export const PAYMENT_PENDING_MIN = 15;

// Хамгийн сүүлийн report_logs мөр (нэг код олон мөртэй байж болно: core-failed-*, дахин оролдлого).
const LATEST = `latest AS (
  SELECT DISTINCT ON (code) code, id, status::text AS status, progress, error,
         "createdAt", "updatedAt"
  FROM report_logs
  WHERE "createdAt" >= now() - $1::interval
  ORDER BY code, "createdAt" DESC
)`;

/**
 * №11-P1 — Monitor (унших-л, шинэ хүснэгтгүй). Хүсэлт бүр:
 *   • READ ONLY transaction + `SET LOCAL statement_timeout` (pgbouncer transaction mode-той нийцтэй),
 *   • time-bounded (`range`), LIMIT-тэй,
 *   • 30–60 с in-memory cache (+ зэрэг ирсэн ижил хүсэлтийг нэгтгэнэ) — polling DB-г үржүүлэхгүй.
 * PII (нэр / и-мэйл / утас) буцаахгүй.
 */
@Injectable()
export class MonitorService {
  private cache = new Map<string, { exp: number; val?: any; p?: Promise<any> }>();
  constructor(private readonly ds: DataSource) {}

  // ---- параметр ----
  parseRange(r?: string): MonitorRange {
    const v = (r ?? '24h') as MonitorRange;
    if (!(v in MONITOR_RANGES)) throw new BadRequestException('range: 1h | 24h | 7d | 30d');
    return v;
  }
  parseState(s?: string): ReportState {
    const v = (s ?? 'all') as ReportState;
    if (!['all', 'stuck', 'failed'].includes(v)) throw new BadRequestException('state: all | stuck | failed');
    return v;
  }
  parseThreshold(t?: string): number {
    if (t === undefined || t === '') return 5;
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0 || n > 1000) throw new BadRequestException('threshold: 0–1000 бүхэл тоо');
    return n;
  }

  // ---- cache + query ----
  private ttlMs(shortMs?: number) {
    const s = Number(process.env.MONITOR_CACHE_SEC ?? 45);
    const ms = (Number.isFinite(s) && s >= 0 ? s : 45) * 1000;
    return shortMs ? Math.min(ms, shortMs) : ms;
  }
  cached<T>(key: string, fn: () => Promise<T>, shortMs?: number): Promise<T> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.exp > now) return hit.p ?? Promise.resolve(hit.val);
    const p = fn().then(
      (val) => {
        this.cache.set(key, { exp: Date.now() + this.ttlMs(shortMs), val });
        return val;
      },
      (err) => {
        this.cache.delete(key);
        throw err;
      },
    );
    this.cache.set(key, { exp: now + this.ttlMs(shortMs), p });
    return p;
  }
  clearCache() {
    this.cache.clear();
  }
  private async q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const timeout = Math.max(500, Number(process.env.MONITOR_STATEMENT_TIMEOUT_MS ?? 5000) | 0);
    return this.ds.transaction(async (m) => {
      await m.query('SET TRANSACTION READ ONLY');
      await m.query(`SET LOCAL statement_timeout = ${timeout}`);
      return m.query(sql, params);
    });
  }
  private meta(range?: MonitorRange) {
    return { ...(range ? { range } : {}), generatedAt: new Date().toISOString() };
  }

  // ---- 1. funnel ----
  private static FUNNEL_SELECT = `
    count(*)::int AS registered,
    count(*) FILTER (WHERE e."userStartDate" IS NOT NULL)::int AS started,
    count(*) FILTER (WHERE e."userEndDate" IS NOT NULL)::int AS finished,
    count(*) FILTER (WHERE rl.status IN ('COMPLETED','SENT'))::int AS "reportReady",
    count(*) FILTER (WHERE e."reportViewedAt" IS NOT NULL)::int AS viewed,
    count(*) FILTER (WHERE ra.paid)::int AS paid
  FROM exam e
  LEFT JOIN LATERAL (
    SELECT r.status::text AS status FROM report_logs r
    WHERE r.code = e.code ORDER BY r."createdAt" DESC LIMIT 1
  ) rl ON true
  LEFT JOIN LATERAL (
    SELECT true AS paid FROM report_access a WHERE a.code = e.code AND a.status = 20 LIMIT 1
  ) ra ON true
  WHERE e."createdAt" >= now() - $1::interval`;

  funnel(range: MonitorRange) {
    return this.cached(`funnel:${range}`, async () => {
      const iv = MONITOR_RANGES[range];
      const [totals] = await this.q(`SELECT ${MonitorService.FUNNEL_SELECT}`, [iv]);
      const byAssessment = await this.q(
        `SELECT e."assessmentName" AS assessment, ${MonitorService.FUNNEL_SELECT}
         GROUP BY e."assessmentName" ORDER BY registered DESC LIMIT 20`,
        [iv],
      );
      const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
      return {
        ...this.meta(range),
        totals,
        // алхам бүрийн өмнөх алхамтай харьцуулсан хувь (drop-off харах)
        conversion: {
          startedOfRegistered: pct(totals.started, totals.registered),
          finishedOfStarted: pct(totals.finished, totals.started),
          reportReadyOfFinished: pct(totals.reportReady, totals.finished),
          viewedOfReportReady: pct(totals.viewed, totals.reportReady),
          paidOfViewed: pct(totals.paid, totals.viewed),
        },
        byAssessment,
      };
    });
  }

  // ---- 3. тайлангийн pipeline ----
  reports(range: MonitorRange, state: ReportState = 'all') {
    return this.cached(`reports:${range}:${state}`, async () => {
      const iv = MONITOR_RANGES[range];
      const wantStuck = state === 'all' || state === 'stuck';
      const wantFailed = state === 'all' || state === 'failed';
      const [counts, stuckA, stuckB, failed, dur, last] = await Promise.all([
        this.q(`WITH ${LATEST} SELECT status, count(*)::int AS n FROM latest GROUP BY status ORDER BY n DESC, status`, [iv]),
        wantStuck
          ? this.q(
              `SELECT e.code, e."assessmentName" AS assessment, e."userEndDate",
                      extract(epoch FROM (now() - e."userEndDate"))::int AS "ageSec",
                      count(*) OVER ()::int AS total
               FROM exam e
               WHERE e."userEndDate" >= now() - $1::interval
                 AND e."userEndDate" < now() - interval '${STUCK_A_MIN} minutes'
                 AND e.code IS NOT NULL
                 AND NOT EXISTS (SELECT 1 FROM report_logs r WHERE r.code = e.code)
               ORDER BY e."userEndDate" DESC LIMIT 100`,
              [iv],
            )
          : [],
        wantStuck
          ? this.q(
              `WITH ${LATEST}
               SELECT code, status, progress, left(error, 200) AS error, "createdAt", "updatedAt",
                      extract(epoch FROM (now() - "updatedAt"))::int AS "ageSec",
                      count(*) OVER ()::int AS total
               FROM latest
               WHERE status NOT IN ('COMPLETED','SENT','FAILED')
                 AND "updatedAt" < now() - interval '${STUCK_B_MIN} minutes'
               ORDER BY "updatedAt" LIMIT 100`,
              [iv],
            )
          : [],
        wantFailed
          ? this.q(
              `WITH ${LATEST}
               SELECT code, progress, left(error, 200) AS error, "createdAt", "updatedAt",
                      count(*) OVER ()::int AS total
               FROM latest WHERE status = 'FAILED' ORDER BY "updatedAt" DESC LIMIT 100`,
              [iv],
            )
          : [],
        this.q(
          `WITH ${LATEST}
           SELECT count(*)::int AS n,
                  percentile_cont(0.5) WITHIN GROUP (ORDER BY s)::float8 AS p50,
                  percentile_cont(0.95) WITHIN GROUP (ORDER BY s)::float8 AS p95
           FROM (SELECT extract(epoch FROM ("updatedAt" - "createdAt")) AS s
                 FROM latest WHERE status IN ('COMPLETED','SENT')) t
           WHERE s BETWEEN 0 AND 3600`,
          [iv],
        ),
        this.q(`SELECT max("updatedAt") AS "lastCompletedAt" FROM report_logs WHERE status IN ('COMPLETED','SENT')`),
      ]);
      const total = (rows: any[]) => rows[0]?.total ?? 0;
      const strip = (rows: any[]) => rows.map(({ total, ...r }) => r);
      return {
        ...this.meta(range),
        counts: Object.fromEntries(counts.map((r: any) => [r.status, r.n])),
        stuckNoLog: { total: total(stuckA), items: strip(stuckA) },
        stuckInProgress: { total: total(stuckB), items: strip(stuckB) },
        failed: { total: total(failed), items: strip(failed) },
        // SENT-ийн updatedAt нь мэйл claim хийсэн цаг тул энэ нь дээд хязгаар (ойролцоо).
        durationSec: { ...dur[0], approx: true },
        lastCompletedAt: last[0]?.lastCompletedAt ?? null,
      };
    });
  }

  // ---- 4. төлбөр ----
  payments(range: MonitorRange) {
    return this.cached(`payments:${range}`, async () => {
      const iv = MONITOR_RANGES[range];
      const [ra, raPending, us, usPending, wallet] = await Promise.all([
        this.q(`SELECT status, count(*)::int AS n, coalesce(sum(price),0)::float8 AS amount
                FROM report_access WHERE "createdAt" >= now() - $1::interval GROUP BY status ORDER BY status`, [iv]),
        this.q(`SELECT id, code, price, "createdAt", extract(epoch FROM (now() - "createdAt"))::int AS "ageSec",
                       count(*) OVER ()::int AS total
                FROM report_access
                WHERE status = 10 AND "createdAt" >= now() - $1::interval
                  AND "createdAt" < now() - interval '${PAYMENT_PENDING_MIN} minutes'
                ORDER BY "createdAt" DESC LIMIT 50`, [iv]),
        this.q(`SELECT status, count(*)::int AS n FROM "userService"
                WHERE "createdAt" >= now() - $1::interval GROUP BY status ORDER BY status`, [iv]),
        this.q(`SELECT id, "createdAt", extract(epoch FROM (now() - "createdAt"))::int AS "ageSec",
                       count(*) OVER ()::int AS total
                FROM "userService"
                WHERE status = 10 AND "qpayInvoiceId" IS NOT NULL
                  AND "createdAt" >= now() - $1::interval
                  AND "createdAt" < now() - interval '${PAYMENT_PENDING_MIN} minutes'
                ORDER BY "createdAt" DESC LIMIT 50`, [iv]),
        this.q(`SELECT method, count(*)::int AS n, coalesce(sum("totalPrice"),0)::float8 AS amount
                FROM payment WHERE "createdAt" >= now() - $1::interval GROUP BY method ORDER BY method`, [iv]),
      ]);
      const total = (rows: any[]) => rows[0]?.total ?? 0;
      const strip = (rows: any[]) => rows.map(({ total, ...r }) => r);
      return {
        ...this.meta(range),
        // status: 10 pending, 20 success, 30 failed, 40 error (PaymentStatus)
        reportAccess: {
          byStatus: ra,
          pendingOver15min: { total: total(raPending), items: strip(raPending) },
        },
        userService: {
          byStatus: us,
          pendingInvoiceOver15min: { total: total(usPending), items: strip(usPending) },
        },
        wallet: { byMethod: wallet },
      };
    });
  }

  // ---- 5. алдаа ----
  errors(range: MonitorRange) {
    return this.cached(`errors:${range}`, async () => {
      const iv = MONITOR_RANGES[range];
      const [sum, top] = await Promise.all([
        this.q(`SELECT count(*)::int AS total,
                       count(*) FILTER (WHERE status >= 500)::int AS "serverErrors",
                       count(*) FILTER (WHERE status BETWEEN 400 AND 499)::int AS "clientErrors"
                FROM error_logs WHERE "timestamp" >= now() - $1::interval`, [iv]),
        this.q(`SELECT status, method, left(split_part(coalesce(url, ''), '?', 1), 120) AS url,
                       left(message, 140) AS message, count(*)::int AS n, max("timestamp") AS "lastAt"
                FROM error_logs WHERE "timestamp" >= now() - $1::interval
                GROUP BY 1, 2, 3, 4 ORDER BY n DESC, "lastAt" DESC LIMIT 20`, [iv]),
      ]);
      return { ...this.meta(range), ...sum[0], top };
    });
  }

  // ---- 2. квот дуусах дөхсөн үйлчилгээ (public QR) ----
  services(threshold = 5) {
    return this.cached(`services:${threshold}`, async () => {
      const rows = await this.q(
        `SELECT s.id, s."userId", s."assessmentId", s.count, s."usedUserCount" AS used,
                (s.count - s."usedUserCount")::int AS remaining,
                (SELECT max(e."createdAt") FROM exam e WHERE e."serviceId" = s.id) AS "lastExamAt"
         FROM "userService" s
         WHERE s.count > 0 AND (s.count - s."usedUserCount") <= $1 AND s.status = 20
           AND EXISTS (SELECT 1 FROM exam e WHERE e."serviceId" = s.id AND e."createdAt" >= now() - interval '30 days')
         ORDER BY remaining ASC, s.id LIMIT 50`,
        [threshold],
      );
      return { ...this.meta(), threshold, items: rows };
    });
  }

  // ---- 6. системийн эрүүл мэнд ----
  health() {
    return this.cached('health', async () => {
      const t0 = Date.now();
      await this.q('SELECT 1');
      const dbMs = Date.now() - t0;
      const [conns, mv, oldest] = await Promise.all([
        this.q(`SELECT coalesce(state, 'background') AS state, count(*)::int AS n
                FROM pg_stat_activity WHERE datname = current_database() GROUP BY 1 ORDER BY n DESC`),
        this.q(`SELECT matviewname AS name, ispopulated AS populated FROM pg_matviews WHERE schemaname = 'public'`),
        this.q(`SELECT extract(epoch FROM (now() - min("createdAt")))::int AS "ageSec"
                FROM report_logs WHERE status NOT IN ('COMPLETED','SENT','FAILED')
                  AND "createdAt" >= now() - interval '7 days'`),
      ]);
      let reportVps: any = { ok: false, error: 'REPORT env тохируулаагүй' };
      if (process.env.REPORT) {
        const base = process.env.REPORT.endsWith('/') ? process.env.REPORT : `${process.env.REPORT}/`;
        const s = Date.now();
        try {
          const r = await axios.get(`${base}check`, { timeout: 3000, validateStatus: () => true });
          reportVps = { ok: r.status === 200, status: r.status, ms: Date.now() - s };
        } catch (e: any) {
          reportVps = { ok: false, error: e?.code ?? e?.message, ms: Date.now() - s };
        }
      }
      return {
        ...this.meta(),
        db: { ms: dbMs, connections: conns },
        materializedViews: mv,
        reportVps,
        oldestPendingReportAgeSec: oldest[0]?.ageSec ?? null,
      };
    }, 15_000);
  }

  // ---- overview (бүх KPI нэг дор; дэлгэрэнгүйг өөр endpoint-оос) ----
  overview(range: MonitorRange) {
    return this.cached(`overview:${range}`, async () => {
      const [funnel, reports, payments, errors, health] = await Promise.all([
        this.funnel(range),
        this.reports(range, 'all'),
        this.payments(range),
        this.errors(range),
        this.health(),
      ]);
      return {
        ...this.meta(range),
        funnel: { totals: funnel.totals, conversion: funnel.conversion },
        reports: {
          counts: reports.counts,
          stuckNoLog: reports.stuckNoLog.total,
          stuckInProgress: reports.stuckInProgress.total,
          failed: reports.failed.total,
          durationSec: reports.durationSec,
          lastCompletedAt: reports.lastCompletedAt,
        },
        payments: {
          reportAccess: payments.reportAccess.byStatus,
          pendingOver15min:
            payments.reportAccess.pendingOver15min.total + payments.userService.pendingInvoiceOver15min.total,
        },
        errors: { total: errors.total, serverErrors: errors.serverErrors, clientErrors: errors.clientErrors },
        health: { dbMs: health.db.ms, reportVps: health.reportVps, oldestPendingReportAgeSec: health.oldestPendingReportAgeSec },
      };
    });
  }
}
