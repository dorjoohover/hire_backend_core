import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Ip,
  Request,
  Headers,
} from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import {
  CreateUserAnswerDto,
  UserAnswerDtoList,
} from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ApiParam } from '@nestjs/swagger';

@Controller('userAnswer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}
  // @Public()
  @Post()
  create(
    @Body() dto: UserAnswerDtoList,
    @Ip() ip: string,
    @Headers() headers,
    @Request() { user },
  ) {
    try {
      const device = headers['user-agent'] ?? '';
      return this.userAnswerService.create(dto, ip, device, user);
    } catch (error) {
      return {
        success: false,
        status: error.status,
        message: error.message,
      };
    }
  }

  @Get()
  @Public()
  findAll() {
    return this.userAnswerService.findAll();
  }

  @Public()
  @Get(':code/:id')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @Param('code') code: string) {
    return this.userAnswerService.findOne(+id, +code);
  }
  @Public()
  @Get('code/code/:code')
  @ApiParam({ name: 'code' })
  findByCode(@Param('code') code: string) {
    return this.userAnswerService.findByCode(+code);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserAnswerDto: UpdateUserAnswerDto,
  ) {
    return this.userAnswerService.update(+id, updateUserAnswerDto);
  }
}
