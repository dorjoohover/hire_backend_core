import { Module } from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import { UserAnswerController } from './user.answer.controller';
import { UserAnswerDao } from './user.answer.dao';
import { QuestionDao } from '../question/dao/question.dao';
import { QuestionAnswerDao } from '../question/dao/question.answer.dao';
import { QuestionAnswerMatrixDao } from '../question/dao/question.answer.matrix.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { FormuleService } from '../formule/formule.service';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { ExamService } from '../exam/exam.service';
import { ExamDetailDao } from '../exam/dao/exam.detail.dao';
import { PdfService } from '../exam/pdf.service';
import { QuestionService } from '../question/question.service';
import { QuestionCategoryDao } from '../question/dao/question.category.dao';
import { VisualizationService } from '../exam/visualization.service';
import { SinglePdf } from '../exam/reports/single.pdf';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from '../user/user.service';
import { JwtModule } from '@nestjs/jwt';
import { UserDao } from '../user/user.dao';
import { jwtConstants } from 'src/auth/constants';
import { DISC } from 'src/assets/report/disc';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [UserAnswerController],
  providers: [
    UserAnswerService,
    UserAnswerDao,
    QuestionDao,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    ExamDao,
    AssessmentDao,
    FormuleService,
    DISC,
    ExamService,
    ExamDetailDao,
    PdfService,
    AuthService,
    UserService,
    UserDao,

    QuestionService,
    QuestionCategoryDao,
    VisualizationService,
    SinglePdf,
    QuestionAnswerCategoryDao,
  ],
})
export class UserAnswerModule {}
