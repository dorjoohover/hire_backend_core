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
  constructor(private moduleRef: ModuleRef) {}
  private REPORT = process.env.REPORT;
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    const res = await axios.post(
      this.REPORT,
      { ...data, role },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      },
    );
    console.log(res.data);
    return { jobId: res.data.jobId };
  }

  async updateStatus(body: any) {
    const { status, result, progress, code, id } = body;
    reportStore[id] = { status, progress, code, result };
  }

  async getByCode(code: string) {
    return (await axios.get(`${this.REPORT}get/code/${code}`)).data;
  }
  async getStatus(jobId: string) {
    let report = reportStore[jobId];

    if (!report) {
      const found = Object.entries(reportStore).find(
        ([, value]) => value.code === jobId,
      );
      console.log(found, reportStore, jobId);
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
      this.sendMail(jobId, report.code);
    }
    return {
      jobId,
      status: report.status,
      progress: report.progress,
      result: report.result ?? null,
      code: report.code,
    };
  }


  async sendMail(jobId: string, code: string) {
    const prev = reportStore[jobId];
    if (prev.status != REPORT_STATUS.SENT) {
      reportStore[jobId] = { ...prev, status: REPORT_STATUS.SENT };
      await this.userAnswer.sendEmail(code);
      axios.get(`${this.REPORT}mail/${jobId}/${REPORT_STATUS.SENT}`);
    }
  }
}
