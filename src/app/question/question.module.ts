import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { QuestionDao } from './dao/question.dao';
import { QuestionAnswerDao } from './dao/question.answer.dao';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { QuestionAnswerMatrixDao } from './dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from './dao/question.answer.category.dao';
import { QuestionAnswerController } from './quetion.answer.controller';
import { QuestionAnswerCategoryController } from './question.answer.category.controller';
import { QuestionAnswerCategoryService } from './question.answer.category.service';
import { QuestionAnswerService } from './question.answer.service';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { UserAnswerDao } from '../user.answer/user.answer.dao';

@Module({
  controllers: [
    QuestionController,
    QuestionAnswerController,
    QuestionAnswerCategoryController,
  ],
  providers: [
    QuestionService,
    QuestionAnswerCategoryService,
    QuestionAnswerService,
    QuestionDao,
    AssessmentDao,
    QuestionAnswerDao,
    QuestionCategoryDao,
    QuestionAnswerMatrixDao,
    QuestionAnswerCategoryDao,
    QuestionAnswerDao,
  ],
  exports: [
    QuestionService,
    QuestionAnswerService,
    QuestionAnswerCategoryService,
  ],
})
export class QuestionModule {}
