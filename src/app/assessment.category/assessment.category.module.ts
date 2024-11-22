import { Module } from '@nestjs/common';
import { AssessmentCategoryService } from './assessment.category.service';
import { AssessmentCategoryController } from './assessment.category.controller';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';

@Module({
  controllers: [AssessmentCategoryController],
  providers: [AssessmentCategoryService, UserService, UserDao],
  exports: [AssessmentCategoryService],
})
export class AssessmentCategoryModule {}
