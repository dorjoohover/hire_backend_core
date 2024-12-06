import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    BaseModule,
    AuthModule,
    AssessmentCategoryModule,
    AssessmentModule,
    QuestionModule,
    ExamModule,
    PaymentModule,
    UserAnswerModule,
    UserModule,
    UserServiceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

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
