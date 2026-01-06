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
// const reportStore: Record<
//   string,
//   {
//     status: string;
//     result?: any;
//     progress: number;
//     code?: string;
//   }
// > = {};
@Injectable()
export class ReportService {
  private userAnswer: UserAnswerService;
  constructor(
    private moduleRef: ModuleRef,
  ) {}
  private REPORT = process.env.REPORT;
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    const res = await axios.post(
      `${this.REPORT}`,
      JSON.stringify({ ...data, role }),
    );
    return { jobId: res.data.jobId };
  }

  // async updateStatus(
  //   jobId: string,
  //   status: string,
  //   result?: any,
  //   progress = 0,
  // ) {
  //   const prev = reportStore[jobId] || {};
  //   // console.log(progress);
  //   reportStore[jobId] = { ...prev, status, result, progress };
  //   if (progress == 100 || status == REPORT_STATUS.COMPLETED) {
  //     this.sendMail(jobId, code);
  //   }
  //   return { jobId, ...reportStore[jobId] };
  // }
  // async updateStatus(
  //   jobId: string,
  //   status: string,
  //   result?: any,
  //   progress = 0,
  // ) {
  //   const prev = reportStore[jobId] || {};
  //   // console.log(progress);
  //   reportStore[jobId] = { ...prev, status, result, progress };
  //   if (progress == 100 || status == REPORT_STATUS.COMPLETED) {
  //     this.sendMail(jobId, code);
  //   }
  //   return { jobId, ...reportStore[jobId] };
  // }

  async getByCode(code: string) {
    return (await axios.get(`${this.REPORT}get/code/${code}`)).data;
  }
  async getStatus(jobId: string) {
    return (await axios.get(`${this.REPORT}job/${jobId}`)).data;
  }

  // async sendMail(jobId: string) {
  //   const prev = reportStore[jobId];
  //   if (prev.status != REPORT_STATUS.SENT) {
  //     reportStore[jobId] = { ...prev, status: REPORT_STATUS.SENT };
  //     this.userAnswer.sendEmail(prev.code);
  //   }
  // }
  async sendMail(jobId: string, code: string) {
    await this.userAnswer.sendEmail(code);
    axios.get(`${this.REPORT}mail/${jobId}/${REPORT_STATUS.SENT}`);
  }
}
