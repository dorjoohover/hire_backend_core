import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import {
  CreateQuestionAllDto,
  CreateQuestionDto,
  ExampleDISCAllDto,
} from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { CreateQuestionTypeDto } from './dto/create-question.type';
import { QuestionTypeService } from './question.type.service';
import { QuestionTypeDao } from './dao/question.type';
import { CreateQuestionCategoryDto } from './dto/create-question.category.dto';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('question')
@ApiBearerAuth('access-token')
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly questionTypeDao: QuestionTypeDao,
    private readonly quesitonCategoryDao: QuestionCategoryDao,
  ) {}

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }
  @Post('all')
  @ApiOperation({
    summary:
      'question-g asuulttain tsug uusgene. asuultad dotor matrix asuulagdana',
  })
  @ApiBody({
    type: CreateQuestionAllDto,
    examples: {
      a: {
        summary: 'All',
        value: ExampleDISCAllDto,
      },
    },
  })
  @Roles(Role.admin)
  createAll(@Body() dto: CreateQuestionAllDto, @Request() { user }) {
    try {
      return this.questionService.createAll(dto, user['id']);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }
  @ApiOperation({
    summary: 'question type uusgene butsaahdaa payload der type',
  })
  @Post('type')
  @Roles(Role.admin)
  async createType(@Body() dto: CreateQuestionTypeDto, @Request() { user }) {
    return await this.questionTypeDao.create({
      ...dto,
      createdUser: user['id'],
    });
  }
  @ApiOperation({
    summary:
      'question category uusgene (wrapper) butsaah utga ni payload der zowhon id',
  })
  @Post('category')
  @Roles(Role.admin)
  async createCategory(
    @Body() dto: CreateQuestionCategoryDto,
    @Request() { user },
  ) {
    return await this.quesitonCategoryDao.create({
      ...dto,
      createdUser: user['id'],
    });
  }

  
  @Public()
  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(+id, updateQuestionDto);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.questionService.remove(+id);
  // }
  @Roles(Role.admin)
  @Delete('all')
  deleteMatrix() {
    return this.questionService.deleteAll();
  }
}
