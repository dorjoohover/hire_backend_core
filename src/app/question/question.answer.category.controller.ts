import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { QuestionAnswerCategoryService } from './question.answer.category.service';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CreateQuestionAnswerCategoryDto } from './dto/create-question.answer.category.dto';
@ApiBearerAuth('access-token')
@Controller('answer/category')
export class QuestionAnswerCategoryController {
  constructor(private readonly service: QuestionAnswerCategoryService) {}
  @Post()
  create(@Body() dto: CreateQuestionAnswerCategoryDto) {
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
