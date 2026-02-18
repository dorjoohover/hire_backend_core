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
    axios.post(
      this.REPORT,
      { ...data, role },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
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
        // id: jobId,
        code: jobId,
        status: REPORT_STATUS.STARTED,
        progress: 0,
        result: null,
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
