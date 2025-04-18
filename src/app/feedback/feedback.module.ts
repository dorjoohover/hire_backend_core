import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { ContactDao } from './contact.dao';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, ContactDao],
})
export class FeedbackModule {}
