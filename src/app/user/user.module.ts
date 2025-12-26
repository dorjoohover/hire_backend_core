import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserDao } from './user.dao';
import { BaseService } from 'src/base/base.service';
import { BaseModule } from 'src/base/base.module';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [BaseModule, EmailModule],
  controllers: [UserController],
  providers: [UserService, UserDao, BaseService, AuthService, JwtService],
  exports: [UserService, UserDao],
})
export class UserModule {}
