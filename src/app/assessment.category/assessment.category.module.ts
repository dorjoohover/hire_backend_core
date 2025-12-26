import { Module } from '@nestjs/common';
import { AssessmentCategoryService } from './assessment.category.service';
import { AssessmentCategoryController } from './assessment.category.controller';
import { UserAnswerModule } from '../user.answer/user.answer.module';
import { UserServiceModule } from '../user.service/user.service.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserAnswerModule, UserServiceModule, UserModule],
  controllers: [AssessmentCategoryController],
  providers: [AssessmentCategoryService],
  exports: [AssessmentCategoryService],
})
export class AssessmentCategoryModule {}
