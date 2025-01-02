import { Module } from '@nestjs/common';
import { FormuleService } from './formule.service';
import { FormuleController } from './formule.controller';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { UserAnswerDao } from '../user.answer/user.answer.dao';

@Module({
  controllers: [FormuleController],
  providers: [FormuleService, QuestionAnswerCategoryDao, UserAnswerDao],
  exports: [FormuleService],
})
export class FormuleModule {}
