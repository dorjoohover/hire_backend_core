import { Controller, Param, Post } from '@nestjs/common';
import { EmailService } from './email.service';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { ApiParam } from '@nestjs/swagger';
import { EmailLogType } from 'src/base/constants';

@Controller('email')
export class EmailController {
  constructor(private service: EmailService) {}
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Post('send/:type/:id')
  @ApiParam({ name: 'type' })
  @ApiParam({ name: 'id' })
  send(@Param('type') type: EmailLogType, @Param('id') id: number) {
    this.service.resend(id, type);
  }
}
