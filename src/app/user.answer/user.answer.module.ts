import { Module } from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import { UserAnswerController } from './user.answer.controller';
import { UserAnswerDao } from './user.answer.dao';

@Module({
  controllers: [UserAnswerController],
  providers: [UserAnswerService, UserAnswerDao],
})
export class UserAnswerModule {}
