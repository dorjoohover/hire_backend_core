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
import { AuthService } from 'src/auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserDao } from '../user/user.dao';
import { jwtConstants } from 'src/auth/constants';
import {
  Belbin,
  DISC,
  Empathy,
  Genos,
  Narc,
  Setgel,
  Darktriad,
  SingleTemplate,
  Holland,
} from 'src/assets/report/index';
import { ResultDao } from './dao/result.dao';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { UserServiceDao } from '../user.service/user.service.dao';
import { PaymentDao } from '../payment/dao/payment.dao';
import { FileService } from 'src/file.service';
@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '30d' },
    }),
  ],
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
    DISC,
    Genos,
    Empathy,
    Narc,
    FileService,
    AssessmentDao,
    Setgel,
    Darktriad,
    Holland,
    SingleTemplate,
    ResultDao,
    TransactionDao,
    UserServiceDao,
    PaymentDao,
    Belbin,
    PdfService,
    QuestionAnswerDao,
    QuestionAnswerMatrixDao,
    FormuleService,
    UserAnswerDao,
    SinglePdf,
    AuthService,
    UserService,
    UserDao,
    QuestionAnswerCategoryDao,
  ],
  exports: [ExamService, ExamDao],
})
export class ExamModule {}
