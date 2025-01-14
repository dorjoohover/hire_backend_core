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

@Module({
  controllers: [AssessmentController, AssessmentLevelController],
  providers: [
    AssessmentService,
    AssessmentDao,
    AssessmentLevelService,
    AssessmentCategoryService,
    UserService,
    UserDao,
    AssessmentLevelDao,
    AssessmentCalculatorService,
    UserAnswerDao,
    QuestionAnswerCategoryDao,
    QuestionDao,
  ],
  exports: [AssessmentService, AssessmentLevelService],
})
export class AssessmentModule {}
