import { Module } from '@nestjs/common';
import { PdfTemplateController } from './pdf-template.controller';
import { PdfTemplateService } from './pdf-template.service';
import { PdfTemplateDao } from './pdf-template.dao';
import { AssessmentAiDataDao } from './assessment-ai-data.dao';
import { AssessmentVariableDao } from './assessment-variable.dao';
import { QuestionModule } from '../question/question.module';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { FileService } from 'src/file.service';
import { ExamModule } from '../exam/exam.module';

@Module({
  // AI Data tab-ийн "Хариултын ангилал" сонголтод QuestionAnswerCategoryService
  // хэрэгтэй тул QuestionModule-г импортолно (тэр өөрөө export-доо оруулсан).
  // ExamModule — "AI JSON-ыг exam-ийн кодоор нь буцаан авах" endpoint-д
  // ExamDao (code -> assessmentId) хэрэгтэй тул импортолно (ExamDao-г
  // AssessmentDao-той хамт өөрөө export хийсэн тул дахин тусад нь provide
  // хийх шаардлагагүй).
  imports: [QuestionModule, ExamModule],
  controllers: [PdfTemplateController],
  // QuestionCategoryDao (асуултын ангилал), FileService (зураг upload) болон
  // AssessmentAiDataDao (AI Data JSON, assessment-аар түлхүүрлэгдсэн)
  // QuestionModule/AppModule-оос export-гдоогүй тул энд шууд provide хийнэ —
  // TypeORM repository-based DAO болон FileService нь модуль хооронд
  // давхардуулж зарлах нь энэ codebase-д аль хэдийн ашиглагддаг хэвшил
  // (жишээ нь ReportModule).
  providers: [PdfTemplateService, PdfTemplateDao, QuestionCategoryDao, FileService, AssessmentAiDataDao, AssessmentVariableDao],
  exports: [PdfTemplateService],
})
export class PdfTemplateModule {}
