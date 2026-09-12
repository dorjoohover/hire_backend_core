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

@Injectable()
export class ReportService {
  private userAnswer: UserAnswerService;
  constructor(
    private moduleRef: ModuleRef,
    private dao: ReportLogDao,
  ) {}
  private REPORT = process.env.REPORT;
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    const { code } = data || {};
    const maxAttempts = 3;
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
          { ...data, role },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10_000,
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
          await new Promise((r) => setTimeout(r, attempt * 1500));
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
      };
    }
    if (
      report.progress == 100 &&
      report.status == REPORT_STATUS.COMPLETED &&
      report.code
    ) {
      this.sendMail(report.code);
    }
    return report;
  }

  async sendMail(code: string) {
    const prev = await this.dao.getOne(code);
    if (prev.status != REPORT_STATUS.SENT) {
      await this.dao.updateByCode(code, { status: REPORT_STATUS.SENT });
      await this.userAnswer.sendEmail(code);
    }
  }
}
