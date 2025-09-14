import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AssessmentDao } from './dao/assessment.dao';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { AssessmentLevelService } from './assessment.level.service';
import { AssessmentLevelController } from './assessment.level.controller';
import { AssessmentCalculatorService } from './assessment.calculator.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { AssessmentCategoryService } from '../assessment.category/assessment.category.service';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { ExamModule } from '../exam/exam.module';
import { EmailLogDao } from '../email_log/email_log.dao';
import { EmailLogService } from '../email_log/email_log.service';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';

@Module({
  imports: [ExamModule, UserAnswerModule, UserServiceModule],
  controllers: [AssessmentController, AssessmentLevelController],
  providers: [
    AssessmentService,
    UserServiceDao,
    AssessmentDao,
    AssessmentLevelService,
    AssessmentCategoryService,
    UserService,
    UserDao,
    AssessmentLevelDao,
    EmailLogService,
    EmailLogDao,
    AssessmentCalculatorService,
    UserAnswerDao,
    QuestionAnswerCategoryDao,
    QuestionDao,
  ],
  exports: [AssessmentService, AssessmentLevelService],
})
export class AssessmentModule {}
