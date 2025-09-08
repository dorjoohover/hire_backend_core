import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
const reportStore: Record<
  string,
  { status: string; result?: any; progress: number }
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

    reportStore[job.id] = { status: 'PENDING', progress: 0 };
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

  async getStatus(jobId: string) {
    const report = reportStore[jobId];
    console.log(report);
    if (!report) return { jobId, status: 'NOT_FOUND', progress: 0 };
    return { jobId, ...report };
  }
}
