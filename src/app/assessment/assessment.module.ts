import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { AssessmentDao } from './dao/assessment.dao';
import { AssessmentLevelDao } from './dao/assessment.level.dao';
import { AssessmentLevelService } from './assessment.level.service';
import { AssessmentLevelController } from './assessment.level.controller';
import { AssessmentCalculatorService } from './assessment.calculator.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';

@Module({
  controllers: [AssessmentController, AssessmentLevelController],
  providers: [
    AssessmentService,
    AssessmentDao,
    AssessmentLevelService,
    AssessmentLevelDao,
    AssessmentCalculatorService,
    UserAnswerDao,
  ],
  exports: [AssessmentService, AssessmentLevelService],
})
export class AssessmentModule {}
