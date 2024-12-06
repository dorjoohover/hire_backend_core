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
import { CreateUserAnswerDto, UserAnswerDtoList } from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('userAnswer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}
  @Public()
  @Post()
  create(
    @Body() dto: UserAnswerDtoList,
    @Ip() ip: string,
    @Headers() headers,
  ) {
    try {
      const device = headers['user-agent'] ?? '';
      return this.userAnswerService.create(dto, ip, device);
    } catch (error) {
      return {
        success: false,
        status: error.status,
        message: error.message,
      };
    }
  }

  @Get()
  findAll() {
    return this.userAnswerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userAnswerService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserAnswerDto: UpdateUserAnswerDto,
  ) {
    return this.userAnswerService.update(+id, updateUserAnswerDto);
  }
}
