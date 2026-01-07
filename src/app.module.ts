import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt/jwt-auth-guard';
import { RolesGuard } from './auth/guards/role/role.guard';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { PostInterceptor } from './post.interceptor';
import { DatabaseModule } from './database/database.module';
import { AssessmentCategoryModule } from './app/assessment.category/assessment.category.module';
import { AssessmentModule } from './app/assessment/assessment.module';
import { QuestionModule } from './app/question/question.module';
import { ExamModule } from './app/exam/exam.module';
import { PaymentModule } from './app/payment/payment.module';
import { UserAnswerModule } from './app/user.answer/user.answer.module';
import { BaseModule } from './base/base.module';
import { UserModule } from './app/user/user.module';
import { UserServiceModule } from './app/user.service/user.service.module';
import { FormuleModule } from './app/formule/formule.module';
import { FeedbackModule } from './app/feedback/feedback.module';
import { BlogModule } from './app/blog/blog.module';
import { ErrorLogModule } from './app/error-logs/error-log.module';

import { BarimtModule } from './app/barimt/barimt.module';
import { FileService } from './file.service';
import { FileErrorLogService } from './base/error-log.service';
import { ReportModule } from './app/report/report.module';
import { BullModule } from '@nestjs/bullmq';
import { EmailLogModule } from './app/email_log/email_log.module';
import { EmailModule } from './app/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.development`,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: 6379,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      },
    }),

    // EbarimtModule,
    DatabaseModule,
    BarimtModule,
    BlogModule,
    BaseModule,
    EmailLogModule,
    EmailModule,
    AuthModule,
    AssessmentCategoryModule,
    AssessmentModule,
    QuestionModule,
    ExamModule,
    PaymentModule,
    FeedbackModule,
    FormuleModule,
    UserAnswerModule,
    ErrorLogModule,
    UserModule,
    UserServiceModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    FileService,
    // EbarimtService,
    FileErrorLogService,
    // EbarimtListener,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PostInterceptor,
    },
  ],
})
export class AppModule {}
