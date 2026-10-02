import { Module } from '@nestjs/common';
import { FormuleService } from './formule.service';
import { FormuleController } from './formule.controller';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { QuestionAnswerViewService } from '../question/question-answer-view.service';

@Module({
  controllers: [FormuleController],
  providers: [FormuleService, QuestionAnswerCategoryDao, UserAnswerDao, QuestionAnswerViewService],
  exports: [FormuleService],
})
export class FormuleModule {}
