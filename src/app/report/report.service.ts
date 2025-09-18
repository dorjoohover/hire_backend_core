import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { ExamService } from '../exam/exam.service';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { ModuleRef } from '@nestjs/core';
import { REPORT_STATUS } from 'src/base/constants';
const reportStore: Record<
  string,
  {
    status: string;
    result?: any;
    progress: number;
    code?: string;
  }
> = {};
@Injectable()
export class ReportService {
  private userAnswer: UserAnswerService;
  constructor(
    private moduleRef: ModuleRef,
    @InjectQueue('report') private reportQueue: Queue,
  ) {}
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    const { code } = data;

    const job = await this.reportQueue.add('default', {
      code,
      role: role ?? Role.admin,
    });

    reportStore[job.id] = { status: 'PENDING', progress: 0, code };
    return { jobId: job.id };
  }

  async updateStatus(
    jobId: string,
    status: string,
    result?: any,
    progress = 0,
  ) {
    const prev = reportStore[jobId] || {};
    // console.log(progress);
    reportStore[jobId] = { ...prev, status, result, progress };
    if (progress == 100 || status == REPORT_STATUS.COMPLETED) {
      this.sendMail(jobId);
    }
    return { jobId, ...reportStore[jobId] };
  }
  findJobIdByCode(code: string) {
    const entry = Object.entries(reportStore).find(
      ([_, value]) => value.code === code,
    );
    return entry ? entry[0] : null; // entry[0] нь jobId
  }
  async getStatus(jobId: string) {
    let report = reportStore[jobId];

    if (!report) {
      const found = Object.entries(reportStore).find(
        ([, value]) => value.code === jobId,
      );
      if (found) {
        [jobId, report] = found;
      }
    }

    if (!report) {
      return {
        jobId,
        status: 'NOT_FOUND',
        progress: 0,
        result: null,
        code: null,
      };
    }
    if (
      report.progress == 100 &&
      report.status == REPORT_STATUS.COMPLETED &&
      report.code
    ) {
      this.sendMail(jobId);
    }
    return {
      jobId,
      status: report.status,
      progress: report.progress,
      result: report.result ?? null,
      code: report.code,
    };
  }

  async sendMail(jobId: string) {
    const prev = reportStore[jobId];
    if (prev.status != REPORT_STATUS.SENT) {
      reportStore[jobId] = { ...prev, status: REPORT_STATUS.SENT };
      this.userAnswer.sendEmail(prev.code);
    }
  }
}
