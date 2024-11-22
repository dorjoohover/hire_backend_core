import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserDao } from './user.dao';
import { BaseService } from 'src/base/base.service';
import { BaseModule } from 'src/base/base.module';

@Module({
  imports: [BaseModule],
  controllers: [UserController],
  providers: [UserService, UserDao, BaseService],
  exports: [UserService],
})
export class UserModule {}
