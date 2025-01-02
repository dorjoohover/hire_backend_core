import { Module } from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import { UserAnswerController } from './user.answer.controller';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { FormuleService } from '../formule/formule.service';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';

@Module({
  controllers: [UserAnswerController],
  providers: [
    UserAnswerService,
    UserAnswerDao,
    QuestionDao,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    ExamDao,
    AssessmentDao,
    FormuleService,
    QuestionAnswerCategoryDao,
  ],
})
export class UserAnswerModule {}
