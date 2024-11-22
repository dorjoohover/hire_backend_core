import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuestionAnswerService } from './question.answer.service';
import { CreateQuestionAnswerDto } from './dto/create-question.answer.dto';
import { ApiParam } from '@nestjs/swagger';

@Controller('question/answer')
export class QuestionAnswerController {
  constructor(private readonly service: QuestionAnswerService) {}
  @Post()
  create(@Body() dto: CreateQuestionAnswerDto) {
    this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
  @Get(':id')
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }
}
