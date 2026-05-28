import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailJobPayload } from './email.dto';
import { EmailLogService } from '../email_log/email_log.service';
import { EmailLogStatus } from 'src/base/constants';
import { ResendService } from './resend.service';

@Processor('email', {
  // Resend Pro = 10 req/sec → параллел 5-аар явуулж секундэд 10 хүрэх
  concurrency: 5,
  lockDuration: 5 * 60 * 1000,
  // 🔥 Resend Pro plan-ийн rate limit = 10/sec
  // 8 болгож бага зэрэг буфер үлдээв (бусад call-д зориулж)
  limiter: {
    max: 8,
    duration: 1000,
  },
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly mailer: ResendService,
    private readonly maillog: EmailLogService,
  ) {
    super();
  }
  async process(job: Job<EmailJobPayload>) {
    const { logId, to, subject, html, attachments } = job.data;
    console.log('SEND', new Date().toISOString(), to, logId);
    try {
      await this.maillog.updateStatus({
        id: logId,
        attemps: job.attemptsMade + 1,
        status: EmailLogStatus.PENDING,
        date: new Date(),
      });

      const res = await this.mailer.sendMail({
        to,
        subject,
        html,
        attachments,
      });
      if (res.error) {
        console.log(res.error);

        const code = res.error?.statusCode ?? 0;
        // 🔴 429 (rate limit) эсвэл 5xx (сервер унасан) → retry хийх
        const isTransient = code === 429 || (code >= 500 && code < 600);

        if (isTransient) {
          await this.maillog.updateStatus({
            id: logId,
            status: EmailLogStatus.RETRYING,
            error: `${code}: ${res.error.message}`,
          });
          // BullMQ exponential backoff-р дахин оролдоно
          throw new Error(`TRANSIENT_${code}`);
        }

        // ❌ 4xx (буруу хаяг, invalid email гэх мэт) — retry хийх ёсгүй
        await this.maillog.updateStatus({
          id: logId,
          status: EmailLogStatus.FAILED,
          error: `${code}: ${res.error.message}`,
        });
        return;
      } else {
        await this.maillog.updateStatus({
          id: logId,
          status: EmailLogStatus.SENT,
        });
      }
    } catch (error: any) {
      console.log(error);
      await this.maillog.updateStatus({
        id: logId,
        status: EmailLogStatus.FAILED,
        date: new Date(),
        error: error?.message?.slice(0, 1000),
      });

      throw error;
    }
  }
}
