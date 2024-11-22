import { Module } from '@nestjs/common';
import { UserServiceService } from './user.service.service';
import { UserServiceController } from './user.service.controller';
import { UserServiceDao } from './user.service.dao';

@Module({
  controllers: [UserServiceController],
  providers: [UserServiceService, UserServiceDao],
})
export class UserServiceModule {}
