import { BullModule } from '@nestjs/bullmq';
import { forwardRef, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailLogModule } from '../email_log/email_log.module';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';
import { ResendService } from './resend.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',

      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      },
    }),
    EmailLogModule,
    UserAnswerModule,
    forwardRef(() => UserServiceModule),
  ],
  providers: [EmailService, EmailProcessor, ResendService],
  exports: [EmailService],
})
export class EmailModule {}
