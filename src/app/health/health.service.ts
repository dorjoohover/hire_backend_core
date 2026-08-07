import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';
import Redis from 'ioredis';
import { LessThan, MoreThan, Not, IsNull, In } from 'typeorm';
import { MetricsService } from 'src/base/metrics.service';
import { ErrorLogService } from '../error-logs/error-log.service';
import { UserServiceEntity } from '../user.service/entities/user.service.entity';
import { ReportLogEntity } from '../report/report.log.entity';
import { PaymentStatus, REPORT_STATUS } from 'src/base/constants';

// Хэдэн минутаас дээш "гацсан" гэж үзэх вэ (тохиргоо шаардлагатай бол env-ээр)
const PAYMENT_STUCK_MIN = Number(process.env.PAYMENT_STUCK_MIN ?? 30);
const REPORT_STUCK_MIN = Number(process.env.REPORT_STUCK_MIN ?? 15);

const execAsync = promisify(exec);
const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));
const gb = (bytes: number) => Math.round((bytes / (1024 * 1024 * 1024)) * 10) / 10;

@Injectable()
export class HealthService implements OnModuleDestroy {
  // Lazy, нэг л удаа үүсгэдэг redis client (BullMQ-той адил REDIS_HOST ашиглана)
  private redisClient: Redis | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly metrics: MetricsService,
    private readonly errorLogService: ErrorLogService,
  ) {}

  onModuleDestroy() {
    this.redisClient?.disconnect();
  }

  private getRedisClient(): Redis {
    if (!this.redisClient) {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST,
        port: 6379,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // health check амжилтгүй бол шууд алдаа буцаана, дахин оролдохгүй
      });
      this.redisClient.on('error', () => {
        // ping()-ийн catch-аар барина, энд зөвхөн unhandled event дуугарахаас сэргийлнэ
      });
    }
    return this.redisClient;
  }

  private getSystem() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return {
      // ⚠️ Docker container дотроос дуудахад host-ийн (эсвэл cgroup-оор
      // хязгаарлаагүй бол бүх VPS-ийн) утгыг харуулж болзошгүй — container-ийн
      // mem_limit-тэй яг таг таарахгүй байж болно, ерөнхий чиг хандлагыг харна.
      loadavg: os.loadavg().map((n) => Math.round(n * 100) / 100),
      cpuCount: os.cpus()?.length ?? null,
      memTotalMb: mb(totalMem),
      memFreeMb: mb(freeMem),
      memUsedPercent: Math.round(((totalMem - freeMem) / totalMem) * 100),
      hostUptimeSec: Math.round(os.uptime()),
    };
  }

  private getProcess() {
    const mem = process.memoryUsage();
    return {
      uptimeSec: Math.round(process.uptime()),
      rssMb: mb(mem.rss),
      heapUsedMb: mb(mem.heapUsed),
      heapTotalMb: mb(mem.heapTotal),
    };
  }

  private async getDisk() {
    try {
      // -k: 1024-byte blocks, POSIX формат — parse хийхэд найдвартай
      const { stdout } = await execAsync('df -k /');
      const line = stdout.trim().split('\n')[1];
      const parts = line.trim().split(/\s+/);
      // Filesystem 1K-blocks Used Available Use% Mounted
      const totalKb = Number(parts[1]);
      const usedKb = Number(parts[2]);
      const availKb = Number(parts[3]);
      const usedPercent = Number(parts[4].replace('%', ''));
      return {
        path: '/',
        sizeGb: gb(totalKb * 1024),
        usedGb: gb(usedKb * 1024),
        availGb: gb(availKb * 1024),
        usedPercent,
      };
    } catch (err) {
      return { error: 'df амжилтгүй', message: (err as Error).message };
    }
  }

  private async getDb() {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const latencyMs = Date.now() - start;
      // pg driver-ийн дотоод Pool — public API биш тул best-effort уншина
      const pool = (this.dataSource.driver as any)?.master;
      const poolStats = pool
        ? {
            total: pool.totalCount ?? null,
            idle: pool.idleCount ?? null,
            waiting: pool.waitingCount ?? null,
          }
        : null;
      return { ok: true, latencyMs, pool: poolStats };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private async getRedis() {
    const start = Date.now();
    try {
      const client = this.getRedisClient();
      await client.ping();
      const latencyMs = Date.now() - start;
      const info = await client.info('memory');
      const usedMemoryHuman =
        /used_memory_human:(.+)/.exec(info)?.[1]?.trim() ?? null;
      const clientsInfo = await client.info('clients');
      const connectedClients = Number(
        /connected_clients:(\d+)/.exec(clientsInfo)?.[1] ?? NaN,
      );
      return {
        ok: true,
        latencyMs,
        usedMemoryHuman,
        connectedClients: Number.isNaN(connectedClients)
          ? null
          : connectedClients,
      };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  /** Docker network дотор ("appnet") core-той хамт байрлах service-үүдийг шалгана */
  private async pingService(url: string) {
    const start = Date.now();
    try {
      await axios.get(url, { timeout: 2000, validateStatus: () => true });
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }

  private async getServices() {
    const [web, admin] = await Promise.all([
      this.pingService(process.env.WEB_HEALTH_URL || 'http://web:3000'),
      this.pingService(process.env.ADMIN_HEALTH_URL || 'http://admin:3001'),
    ]);
    return {
      core: { ok: true },
      web,
      admin,
      // report тусдаа VPS дээр, өөр docker network дээр ажилладаг тул
      // core-оос шууд хандах боломжгүй — цаашид шаардлагатай бол
      // report талдаа өөрийн /health endpoint нэмээд admin-аас шууд дуудуулж болно.
      report: { ok: null, note: 'Тусдаа VPS дээр — core-оос хараагдахгүй' },
    };
  }

  /**
   * Чухал бизнес flow-уудын "гацсан/амжилтгүй" тохиолдлыг харна. Эдгээр
   * нь ихэвчлэн exception шиддэггүй (try/catch-аар дотроо зөөлөн барьчихдаг,
   * ж: qpay.service.ts-ийн createInvoice/getInvoice) тул ердийн
   * "Алдааны лог"-д огт ордоггүй — тиймээс тусдаа шалгана.
   */
  private async getFlows() {
    const userServiceRepo = this.dataSource.getRepository(UserServiceEntity);
    const reportLogRepo = this.dataSource.getRepository(ReportLogEntity);

    const paymentStuckSince = new Date(
      Date.now() - PAYMENT_STUCK_MIN * 60_000,
    );
    const reportStuckSince = new Date(
      Date.now() - REPORT_STUCK_MIN * 60_000,
    );
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000);

    const [
      paymentStuckCount,
      paymentTodayTotal,
      paymentTodaySuccess,
      reportStuckCount,
      reportFailedToday,
      examErrors,
      answerErrors,
    ] = await Promise.all([
      // Төлбөр: PENDING-ээс шилжээгүй, threshold-оос хуучин — QPay invoice
      // үүсээгүй эсвэл webhook ирээгүй байж болзошгүй "алга болсон" төлбөр
      userServiceRepo.count({
        where: {
          status: PaymentStatus.PENDING,
          createdAt: LessThan(paymentStuckSince),
        },
      }),
      userServiceRepo.count({ where: { createdAt: MoreThan(todayStart) } }),
      userServiceRepo.count({
        where: {
          createdAt: MoreThan(todayStart),
          status: PaymentStatus.SUCCESS,
        },
      }),
      // Тайлан (PDF/S3): COMPLETED/SENT болоогүй, threshold-оос удаан үргэлжилсэн
      reportLogRepo.count({
        where: {
          status: Not(In([REPORT_STATUS.COMPLETED, REPORT_STATUS.SENT])),
          updatedAt: LessThan(reportStuckSince),
        },
      }),
      // Тайлан: error багана бичигдсэн (өнөөдөр үүссэн)
      reportLogRepo.count({
        where: { error: Not(IsNull()), createdAt: MoreThan(todayStart) },
      }),
      this.errorLogService.countSinceByUrlPrefix(oneDayAgo, '/exam'),
      this.errorLogService.countSinceByUrlPrefix(oneDayAgo, '/userAnswer'),
    ]);

    return {
      payment: {
        stuckPending: paymentStuckCount,
        stuckThresholdMin: PAYMENT_STUCK_MIN,
        todayTotal: paymentTodayTotal,
        todaySuccess: paymentTodaySuccess,
      },
      report: {
        stuck: reportStuckCount,
        stuckThresholdMin: REPORT_STUCK_MIN,
        failedToday: reportFailedToday,
      },
      exam: {
        errorsLast24h: examErrors + answerErrors,
      },
    };
  }

  private getApp() {
    const last5 = this.metrics.stats(5);
    const last15 = this.metrics.stats(15);
    return {
      requestsLast5Min: last5.count,
      avgResponseMsLast5Min: last5.avgMs,
      requestsLast15Min: last15.count,
      avgResponseMsLast15Min: last15.avgMs,
    };
  }

  async getMetrics() {
    const oneHourAgo = new Date(Date.now() - 60 * 60_000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60_000);

    const [disk, db, redis, services, errorsLast1h, errorsLast24h, flows] =
      await Promise.all([
        this.getDisk(),
        this.getDb(),
        this.getRedis(),
        this.getServices(),
        this.errorLogService.countSince(oneHourAgo),
        this.errorLogService.countSince(oneDayAgo),
        this.getFlows(),
      ]);

    return {
      ts: new Date().toISOString(),
      system: this.getSystem(),
      process: this.getProcess(),
      disk,
      db,
      redis,
      services,
      app: {
        ...this.getApp(),
        errorsLast1h,
        errorsLast24h,
      },
      flows,
    };
  }
}
