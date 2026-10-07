import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { ExamService } from '../exam/exam.service';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { ModuleRef } from '@nestjs/core';
import { REPORT_STATUS } from 'src/base/constants';
import axios from 'axios';
import { ReportLogDao } from './report.log.dao';
import { ReportPipelineService } from './report-pipeline.service';
import { DataSource } from 'typeorm';
import { decideEnsure, EnsureDecision } from './report-ensure';

/**
 * v1.3.0: web-д зориулсан бэлэн байдал. result нь PDF-ээс ӨМНӨ бичигддэг
 * (legacy: progress 30 WRITING, v2: 40) — тиймээс үр дүнгийн хуудсыг PDF хүлээлгүй
 * харуулж болно; PDF товч нь pdfReady болтол хүлээнэ.
 */
export function readiness(r: { status?: string; progress?: number }) {
  const done = r.status === REPORT_STATUS.COMPLETED || r.status === REPORT_STATUS.SENT;
  return {
    resultReady: done || (r.status !== REPORT_STATUS.FAILED && Number(r.progress ?? 0) >= 30),
    pdfReady: done,
  };
}

@Injectable()
export class ReportService {
  private userAnswer: UserAnswerService;
  constructor(
    private moduleRef: ModuleRef,
    private dao: ReportLogDao,
    private pipeline: ReportPipelineService,
    private ds: DataSource,
  ) {}
  private REPORT = process.env.REPORT;
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    const { code } = data || {};
    // v1.3.0: REPORT_PIPELINE=v2 → core-ийн `report-calc` queue (HTTP handoff, retry, core-failed-* алга).
    if (this.pipeline.enabled() && code) {
      try {
        return await this.pipeline.enqueueCalc({
          code: String(code),
          role: role ?? data?.role,
          examFinishedAt: Date.now(),
          priority: data?.priority,
          recalculate: !!data?.recalculate,
          notify: !!data?.notify,
        });
      } catch (e: any) {
        console.error('❌ createReport (v2) queue-д оруулж чадсангүй:', code, e?.message ?? e);
        throw e;
      }
    }
    // ⚠️ 2026-09-28: 3 оролдлого x 10с timeout (1.5с/3с backoff-той, нийт ~34.5с) хэт
    // богино болсныг илрvvлэв — hire_report (report-1/report-2) нь concurrency:1 тул
    // тухайн container PDF бичиж байх vед (одоо 48-64с хvртэл vргэлжилж болдог) ӨӨРИЙН
    // event loop-оороо шинэ HTTP хvсэлт (яг энэ createReport дуудлага) хvлээж авч чадахгvй
    // болдог тул, хоёр instance хоёул завгvй vед 34.5с дотор аль нэг нь суллагдахгvй байх
    // магадлал өндөр — тэгвэл createReport бvрмөсөн FAILED болж (`core-failed-*` мөр),
    // BullMQ рvv ХЭЗЭЭ Ч орохгvй тайлан бvрмөсөн алга болдог (нотолгоо: 2026-09-27 load
    // test vед 11 core-failed мөр vvссэн). Иймд оролдлого/хугацааг нэмж, дор хаяж нэг
    // instance суллагдах хvртэл хvлээх боломж vлдээв.
    // ⏱️ 2026-09-28: pipeline stage-timing — hire_report рvv дамжуулахаас
    // ӨМНӨх саатлыг (endExam дуудагдсанаас createReport энд орж ирэх хvртэл,
    // мөн доорх retry loop-ийн backoff-той хамт) хэмжихийн тулд НЭГ л удаа,
    // retry эхлэхээс ӨМНӨ тэмдэглэнэ. hire_report (app.service.ts) энэ утгыг
    // хvлээж аваад "handoff" stage-ыг логлодог.
    const examFinishedAt = Date.now();
    const maxAttempts = 6;
    let lastError: any = null;

    // ⚠️ FIX (2026-09-12): өмнө нь 1 удаа л оролддог, амжилтгүй бол зөвхөн
    // console.error-т бичээд өнгөрдөг байсан тул hire_report түр
    // хүрэлцэхгүй байх богино мөчид (жишээ нь healthcheck.sh-ийн
    // auto-restart цонх) таарвал тэр тайлан ХЭЗЭЭ Ч үүсгэхгүй, ямар ч
    // ул мөргүй мөнхед алга болдог байсан (нотолгоо: 2 бодит
    // production кейс, 1 нь 19 хоног ийм байдалтайгаар олдсон).
    // Одоо timeout-той, богино backoff-той 3 удаа дахин оролдно.
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await axios.post(
          this.REPORT,
          { ...data, role, examFinishedAt },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15_000,
          },
        );
        return;
      } catch (err) {
        lastError = err;
        console.error(
          `❌ createReport: report руу хүсэлт илгээхэд алдаа гарлаа (оролдлого ${attempt}/${maxAttempts}, REPORT=${this.REPORT}):`,
          (err as any)?.response?.status,
          (err as any)?.message,
        );
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, attempt * 3000));
        }
      }
    }

    if (code) {
      try {
        await this.dao.create({
          id: `core-failed-${code}-${Date.now()}`,
          code,
          role: role ?? Role.admin,
          status: REPORT_STATUS.FAILED,
          progress: 0,
          error: `createReport ${maxAttempts} оролдлого амжилтгүй: ${lastError?.message ?? 'unknown'}`,
        });
      } catch (e) {
        console.error(
          '❌ createReport: FAILED мөр бичихэд алдаа гарлаа:',
          (e as any)?.message,
        );
      }
    }
  }

  /**
   * PDF хүссэн боловч тайлан бэлэн биш / алга (FAILED, мөргүй, гацсан, файл нь алга) үед:
   * гаргах боломжтой бол ЗААВАЛ шинээр оруулна (дараалал хамаагүй), боломжгүй бол алдаа.
   * Автомат оролдлого бүр ops_action_log-д `report.auto` гэж бичигдэнэ — 3 мин-ийн дотор
   * давтахгүй (web 5с тутам дахин асуудаг), 24 цагт ≤ REPORT_AUTO_MAX (3).
   */
  async ensureReport(
    code: string,
    log: { status?: any; error?: any; updatedAt?: any; role?: number } | null,
    fileMissing: boolean,
  ): Promise<EnsureDecision> {
    const [exam] = await this.ds.query(
      `SELECT "userEndDate" FROM exam WHERE code = $1 LIMIT 1`,
      [String(code)],
    );
    const [auto] = await this.ds.query(
      `SELECT count(*)::int AS n, max("createdAt") AS last
         FROM ops_action_log
        WHERE code = $1 AND action = 'report.auto' AND "createdAt" > now() - interval '24 hours'`,
      [String(code)],
    );
    const decision = decideEnsure({
      log,
      fileMissing,
      examExists: !!exam,
      examFinished: exam?.userEndDate != null,
      autoAttempts: Number(auto?.n ?? 0),
      lastAutoAt: auto?.last ?? null,
    });
    if (decision.action !== 'generate') return decision;

    await this.ds
      .query(
        `INSERT INTO ops_action_log (action, code, status, detail) VALUES ('report.auto', $1, 'ok', $2)`,
        [
          String(code),
          JSON.stringify({ reason: decision.reason, prev: log?.status ?? null }),
        ],
      )
      .catch((e) => console.error('report.auto audit:', e?.message));
    console.log(`🔁 [report.auto] code=${code} reason=${decision.reason} prev=${log?.status ?? '-'}`);

    // Хүлээлгэхгүй: legacy createReport нь hire_report-ийг ~1 мин хүртэл дахин оролддог.
    this.createReport({ code: String(code) }, log?.role).catch((e) =>
      console.error(`❌ [report.auto] code=${code}:`, e?.message ?? e),
    );
    return decision;
  }

  // async updateStatus(body: any) {
  //   const { status, result, progress, code, id } = body;
  //   reportStore[id] = { status, progress, code, result };
  // }

  async getByCode(code: string) {
    return await this.dao.getOne(code);
  }
  async getStatus(jobId: string) {
    let report = await this.dao.getOne(jobId);

    if (!report) {
      return {
        id: null,
        status: REPORT_STATUS.PENDING,
        progress: 0,
        result: null,
        code: jobId,
        resultReady: false,
        pdfReady: false,
      };
    }
    if (
      report.progress == 100 &&
      report.status == REPORT_STATUS.COMPLETED &&
      report.code
    ) {
      // ⚠️ Энэ нь awaitлагдаагүй "floating promise". Дотор нь алдаа гарвал
      // Node 15+ дээр unhandled rejection → процесс унах эрсдэлтэй байсан
      // (public/QR тестийн exam.user = null үед sendEmail дотор
      // `const { email } = user` TypeError өгдөг байсан). Тайлангийн төлөв
      // буцаах нь мэйл илгээхээс хамаарах ёсгүй тул энд catch хийнэ.
      this.sendMail(report.code).catch((error) =>
        console.error('❌ sendMail алдаа:', error?.message),
      );
    }
    return { ...report, ...readiness(report) };
  }

  // v1.3.0 дотоод (InternalKeyGuard) — hire_report render worker / calc service.
  async internalStatus(body: any) {
    return this.pipeline.patchStatus(body ?? {});
  }

  async internalData(body: any) {
    return this.pipeline.proxyData(body ?? {});
  }

  async sendMail(code: string) {
    // ⚠️ Өмнө нь `status != SENT` бол (WRITING, FAILED … ч гэсэн) SENT болгож
    // мэйл илгээдэг байсан тул `report/mail/:code`-г дуудсан хэн ч бэлэн болоогүй
    // тайланг "SENT" болгож төлөв эвдэж чаддаг, зэрэг ирсэн 2 дуудлага давхар
    // мэйл илгээж болдог байв. Одоо зөвхөн COMPLETED → SENT-ийг атомар авсан
    // ганц дуудлага илгээнэ.
    const claimed = await this.dao.claimSent(code);
    if (!claimed) return;
    await this.userAnswer.sendEmail(code);
  }
}
