import { forwardRef, Module } from '@nestjs/common';
import { EmailLogService } from './email_log.service';
import { EmailLogController } from './email_log.controller';
import { EmailLogDao } from './email_log.dao';
import { UserServiceModule } from '../user.service/user.service.module';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { BarimtModule } from '../barimt/barimt.module';
import { BarimtService } from '../barimt/barimt.service';

@Module({
  imports: [
    forwardRef(() => BarimtModule),
    UserServiceModule,
    UserAnswerModule,
    
  ],
  controllers: [EmailLogController],
  providers: [EmailLogService, EmailLogDao],
  exports: [EmailLogService, EmailLogDao],
})
export class EmailLogModule {}
