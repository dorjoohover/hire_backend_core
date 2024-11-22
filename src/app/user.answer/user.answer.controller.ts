import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import { CreateUserAnswerDto } from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';

@Controller('user.answer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}

  @Post()
  create(@Body() createUserAnswerDto: CreateUserAnswerDto) {
    return this.userAnswerService.create(createUserAnswerDto);
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
  update(@Param('id') id: string, @Body() updateUserAnswerDto: UpdateUserAnswerDto) {
    return this.userAnswerService.update(+id, updateUserAnswerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userAnswerService.remove(+id);
  }
}
