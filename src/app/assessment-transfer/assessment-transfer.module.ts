import { Module } from '@nestjs/common';
import { FileService } from 'src/file.service';
import { QuestionAnswerViewService } from '../question/question-answer-view.service';
import { AssessmentTransferController } from './assessment-transfer.controller';
import { AssessmentTransferService } from './assessment-transfer.service';

// DataSource (global) + FileService + харагдацын refresh-ээс өөр хамааралгүй —
// QuestionModule ("Хувилах") үүнийг циклгүйгээр import хийнэ.
@Module({
  controllers: [AssessmentTransferController],
  providers: [AssessmentTransferService, FileService, QuestionAnswerViewService],
  exports: [AssessmentTransferService],
})
export class AssessmentTransferModule {}
