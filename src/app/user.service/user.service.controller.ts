import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserServiceService } from './user.service.service';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
  SendLinkToEmail,
  SendLinkToEmails,
} from './dto/create-user.service.dto';
import {
  UpdateDateDto,
  UpdateUserServiceDto,
} from './dto/update-user.service.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('userService')
@ApiBearerAuth('access-token')
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Post()
  create(
    @Body() createUserServiceDto: CreateUserServiceDto,
    @Request() { user },
  ) {
    try {
      return this.userServiceService.create(createUserServiceDto, user);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  @Post('send')
  @Public()
  // @Roles(Role.organization)
  sendCodeToEmail(@Body() dto: SendLinkToEmails) {
    this.userServiceService.sendLinkToMail(dto);
  }

  @Post('exam')
  createExam(@Body() dto: CreateExamServiceDto, @Request() { user }) {
    try {
      return this.userServiceService.createExam(dto, user['id'], user['role']);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  @Get('ebarimt/:id')
  @ApiParam({ name: 'id' })
  getEbarimt(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.getEbarimt(+id, user['email']);
  }
  @Delete('ebarimt/:id')
  @ApiParam({ name: 'id' })
  deleteEbarimt(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.deleteEbarimt(+id);
  }

  @Get('checkPayment/:id/:code')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'id' })
  checkPayment(
    @Param('id') id: string,
    @Param('code') code: string,
    @Request() { user },
  ) {
    console.log(id, code);
    return this.userServiceService.checkPayment(
      +id,
      code,
      +user['id'],
      user['email'],
    );
  }
  @Get()
  findAll() {
    return this.userServiceService.findAll();
  }
  @Get('user/:id')
  @ApiParam({ name: 'id' })
  findById(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.findByUser(+id, +user['id'], user['email']);
  }

  @Get('find/:id')
  findOne(@Param('id') id: string) {
    return this.userServiceService.findOne(+id);
  }

  // @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  // @Patch('date/:id')
  // update(@Param('id') id: string, @Body() dto: UpdateDateDto) {
  //   return this.userServiceService.update(+id, dto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userServiceService.remove(+id);
  }
}
