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
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { CreateQuestionCategoryDto } from './dto/create-question.category.dto';
import { QuestionCategoryDao } from './dao/question.category.dao';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

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
  @Roles(Role.admin)
  updateAll(@Body() dto: CreateQuestionAllDto, @Request() { user }) {
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

  @Get('get/:id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(+id);
  }
  @Public()
  @Get('assessment/:id')
  findOneByAssessment(@Param('id') id: string) {
    return this.questionService.findOneByAssessment(+id);
  }

  @Roles(Role.admin)
  @Delete('question/:id')
  deleteQuestion(@Param('id') id: string) {
    return this.questionService.deleteQuestion(+id);
  }

  @Roles(Role.admin)
  @Delete('category/:id')
  @ApiOperation({
    summary: 'question category/block/ ustgana',
  })
  deleteQuestionCategory(@Param('id') id: string) {
    return this.questionService.deleteQuestionCategory(+id);
  }
  @Roles(Role.admin)
  @Delete('all')
  deleteMatrix() {
    return this.questionService.deleteAll();
  }
}
