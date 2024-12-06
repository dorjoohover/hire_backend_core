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
} from './dto/create-user.service.dto';
import { UpdateUserServiceDto } from './dto/update-user.service.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

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
