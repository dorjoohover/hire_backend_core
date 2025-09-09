import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { ExamService } from '../exam/exam.service';
const reportStore: Record<
  string,
  { status: string; result?: any; progress: number; code?: string }
> = {};
@Injectable()
export class ReportService {
  constructor(@InjectQueue('report') private reportQueue: Queue) {}
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
    console.log(progress);
    reportStore[jobId] = { ...prev, status, result, progress };
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

    // Хэрэв jobId-р олдохгүй бол code-р хайна
    if (!report) {
      const found = Object.entries(reportStore).find(
        ([, value]) => value.code === jobId,
      );
      if (found) {
        [jobId, report] = found;
      }
    }

    if (!report) {
      return { jobId, status: 'NOT_FOUND', progress: 0 };
    }

    return { jobId, ...report };
  }
}
