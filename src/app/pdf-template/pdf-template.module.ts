import { Module } from '@nestjs/common';
import { PdfTemplateController } from './pdf-template.controller';
import { PdfTemplateService } from './pdf-template.service';
import { PdfTemplateDao } from './pdf-template.dao';
import { AssessmentAiDataDao } from './assessment-ai-data.dao';
import { AssessmentVariableDao } from './assessment-variable.dao';
import { QuestionModule } from '../question/question.module';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { FileService } from 'src/file.service';
import { ExamModule } from '../exam/exam.module';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { AiAgentGuard } from 'src/auth/guards/ai-agent/ai-agent.guard';

@Module({
  // AI Data tab-ийн "Хариултын ангилал" сонголтод QuestionAnswerCategoryService
  // хэрэгтэй тул QuestionModule-г импортолно (тэр өөрөө export-доо оруулсан).
  // ExamModule — "AI JSON-ыг exam-ийн кодоор нь буцаан авах" endpoint-д
  // ExamDao (code -> assessmentId) хэрэгтэй тул импортолно (ExamDao-г
  // AssessmentDao-той хамт өөрөө export хийсэн тул дахин тусад нь provide
  // хийх шаардлагагүй).
  imports: [QuestionModule, ExamModule],
  controllers: [PdfTemplateController],
  // QuestionCategoryDao (асуултын ангилал), FileService (зураг upload),
  // AssessmentAiDataDao (AI Data JSON, assessment-аар түлхүүрлэгдсэн) болон
  // AssessmentDao/QuestionDao (AI export endpoint-д assessmentId-аар шууд
  // assessment унших, AssessmentDao QuestionDao хамааралтай тул хамт) —
  // QuestionModule/ExamModule-оос export-гдоогүй тул энд шууд provide хийнэ —
  // TypeORM repository-based DAO болон FileService нь модуль хооронд
  // давхардуулж зарлах нь энэ codebase-д аль хэдийн ашиглагддаг хэвшил
  // (жишээ нь ReportModule). AiAgentGuard — ai-export/:assessmentId route-ыг
  // хамгаалах, DI-аар шийдвэрлэгдэхийн тулд provider-т нэмнэ.
  providers: [
    PdfTemplateService,
    PdfTemplateDao,
    QuestionCategoryDao,
    FileService,
    AssessmentAiDataDao,
    AssessmentVariableDao,
    QuestionDao,
    AssessmentDao,
    AiAgentGuard,
  ],
  exports: [PdfTemplateService],
})
export class PdfTemplateModule {}
