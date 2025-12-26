import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailJobPayload } from './email.dto';
import { EmailLogService } from '../email_log/email_log.service';
import { EmailLogStatus } from 'src/base/constants';
import { ResendService } from './resend.service';

@Processor('email', {
  concurrency: 1, // email-д хангалттай
  lockDuration: 5 * 60 * 1000,
})
export class EmailProcessor extends WorkerHost {
  constructor(
    private readonly mailer: ResendService,
    private readonly maillog: EmailLogService,
  ) {
    super();
  }
  get workerOptions() {
    return {
      limiter: {
        max: 1, // 👈
        duration: 1000, // 👈 1 секундэд 1 job
      },
      // extra safety
      drainDelay: 200,
    };
  }
  async process(job: Job<EmailJobPayload>) {
    const { logId, to, subject, html, attachments } = job.data;
    console.log('SEND', new Date().toISOString(), to);
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

        // 🔴 429 = retry later
        if (res.error?.statusCode === 429) {
          await this.maillog.updateStatus({
            id: logId,
            status: EmailLogStatus.RETRYING,
            error: res.error.message,
          });

          // 👇 BullMQ өөрөө delay/backoff хийж retry хийнэ
          throw new Error('RATE_LIMIT_429');
        }

        // ❌ бусад алдаа
        if (res.error) {
          await this.maillog.updateStatus({
            id: logId,
            status: EmailLogStatus.FAILED,
            error: res.error.message,
          });
          return;
        }
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
