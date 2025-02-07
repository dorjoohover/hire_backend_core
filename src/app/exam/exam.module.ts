import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamDao } from './dao/exam.dao';
import { ExamDetailDao } from './dao/exam.detail.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionService } from '../question/question.service';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { FormuleService } from '../formule/formule.service';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { VisualizationService } from './visualization.service';
import { PdfService } from './pdf.service';
import { SinglePdf } from './reports/single.pdf';

@Module({
  controllers: [ExamController],
  providers: [
    ExamService,
    ExamDao,
    ExamDetailDao,
    QuestionDao,
    QuestionCategoryDao,
    AssessmentDao,
    QuestionService,
    VisualizationService,
    PdfService,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    FormuleService,
    UserAnswerDao,
    SinglePdf,
    QuestionAnswerCategoryDao,
  ],
  exports: [ExamService, ExamDao],
})
export class ExamModule {}
