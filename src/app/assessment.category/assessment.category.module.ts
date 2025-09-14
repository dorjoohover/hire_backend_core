import { Module } from '@nestjs/common';
import { AssessmentCategoryService } from './assessment.category.service';
import { AssessmentCategoryController } from './assessment.category.controller';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';

@Module({
  imports: [UserAnswerModule, UserServiceModule],
  controllers: [AssessmentCategoryController],
  providers: [
    AssessmentCategoryService,
    UserService,
    UserDao,
    EmailLogService,
    EmailLogDao,
  ],
  exports: [AssessmentCategoryService],
})
export class AssessmentCategoryModule {}
