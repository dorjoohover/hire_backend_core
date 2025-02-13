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
  ExampleConstantSumAllDto,
  ExampleDISCAllDto,
  ExampleMultipleAllDto,
  ExampleSingleAllDto,
  ExampleTrueFalseAllDto,
} from './dto/create-question.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { CreateQuestionCategoryDto } from './dto/create-question.category.dto';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { QuestionAnswerDao } from './dao/question.answer.dao';
import {
  CreateQuestionAnswerDto,
  UpdateQuestionAnswersDto,
} from './dto/create-question.answer.dto';
import { CreateQuestionAnswerCategoryDto } from './dto/create-question.answer.category.dto';

@Controller('question')
@ApiBearerAuth('access-token')
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly quesitonCategoryDao: QuestionCategoryDao,
  ) {}

  @Post()
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionService.create(createQuestionDto);
  }
  @Patch('all')
  @ApiOperation({
    summary:
      'question-g asuulttain tsug uusgene. asuultad dotor matrix asuulagdana',
  })
  @ApiBody({
    type: CreateQuestionAllDto,
    examples: {
      a: {
        summary: 'Matrix',
        value: ExampleDISCAllDto,
      },
      b: {
        summary: 'Multiple',
        value: ExampleMultipleAllDto,
      },
      c: {
        summary: 'Single',
        value: ExampleSingleAllDto,
      },
      d: {
        summary: 'TrueFalse',
        value: ExampleTrueFalseAllDto,
      },
      f: {
        summary: 'ConstantSum',
        value: ExampleConstantSumAllDto,
      },
    },
  })
  @Roles(Role.super_admin, Role.tester, Role.admin)
  updateAll(@Body() dto: CreateQuestionAllDto, @Request() { user }) {
    try {
      return this.questionService.updateAll(dto, user['id']);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  @Post('answer/:matrix')
  @ApiParam({ name: 'matrix' })
  @Roles(Role.super_admin, Role.tester, Role.admin)
  deleteAnswer(
    @Body() dto: { data: number[] },
    @Param('matrix') matrix: number,
    @Request() { user },
  ) {
    try {
      return this.questionService.deleteAnswer(dto, matrix == 0);
    } catch (error) {
      return {
        message: error.message,
        status: error.status,
        success: false,
      };
    }
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
        summary: 'Matrix',
        value: ExampleDISCAllDto,
      },
      b: {
        summary: 'Multiple',
        value: ExampleMultipleAllDto,
      },
      c: {
        summary: 'Single',
        value: ExampleSingleAllDto,
      },
      d: {
        summary: 'TrueFalse',
        value: ExampleTrueFalseAllDto,
      },
      f: {
        summary: 'ConstantSum',
        value: ExampleConstantSumAllDto,
      },
    },
  })
  @Roles(Role.super_admin, Role.tester, Role.admin)
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
  @ApiOperation({
    summary:
      'question category uusgene (wrapper) butsaah utga ni payload der zowhon id',
  })
  @Post('category')
  @Roles(Role.super_admin, Role.tester, Role.admin)
  async createCategory(
    @Body() dto: CreateQuestionCategoryDto,
    @Request() { user },
  ) {
    return await this.quesitonCategoryDao.create({
      ...dto,
      createdUser: user['id'],
    });
  }
  @Patch('category')
  @Roles(Role.super_admin, Role.tester, Role.admin)
  async updateCategory(
    @Body() dto: CreateQuestionCategoryDto,
    @Request() { user },
  ) {
    return await this.quesitonCategoryDao.updateOne(dto, user['id']);
  }

  @Public()
  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(+id);
  }
  // @Public()
  // @Roles(Role.admin)
  @Get('assessment/:id')
  async findOneByAssessment(@Param('id') id: string, @Request() { user }) {
    const role = +user?.['role'];
    const admin =
      role == Role.admin || role == Role.super_admin || role == Role.tester;
    const res = await this.questionService.findOneByAssessment(+id, admin);

    return res;
  }
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Delete('question/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.questionService.deleteQuestion(+id);
  }
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Delete('category/:id')
  @ApiOperation({
    summary: 'question category/block/ ustgana',
  })
  deleteQuestionCategory(@Param('id') id: string) {
    return this.questionService.deleteQuestionCategory(+id);
  }
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Delete('all')
  deleteMatrix() {
    return this.questionService.deleteAll();
  }

  @Delete('answerCategory/:id')
  @ApiParam({ name: 'id' })
  @Roles(Role.super_admin, Role.tester, Role.admin)
  deleteAnswerCategory(@Param('id') id: string) {
    return this.questionService.deleteAnswerCategory(+id);
  }

  @Patch('answerCategory')
  setAnswerCategory(@Body() dto: CreateQuestionAnswerCategoryDto) {
    return this.questionService.updateAnswerCategory(dto);
  }
  @Public()
  @Get('testing/:id')
  @ApiParam({ name: 'id' })
  testing(@Param('id') id: string) {
    return this.questionService.testing(+id);
  }
}
