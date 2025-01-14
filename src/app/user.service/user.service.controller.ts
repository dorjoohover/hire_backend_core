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
} from './dto/create-user.service.dto';
import { UpdateUserServiceDto } from './dto/update-user.service.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
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
  sendCodeToEmail(@Body() dto: SendLinkToEmail) {
    this.userServiceService.sendLinkToMail(dto);
  }

  @Post('exam')
  createExam(@Body() dto: CreateExamServiceDto, @Request() { user }) {
    try {
      return this.userServiceService.createExam(dto, user['id']);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }
  @Get()
  findAll() {
    return this.userServiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userServiceService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserServiceDto: UpdateUserServiceDto,
  ) {
    return this.userServiceService.update(+id, updateUserServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userServiceService.remove(+id);
  }
}
