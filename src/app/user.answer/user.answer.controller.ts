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
  UseGuards,
} from '@nestjs/common';
import { UserAnswerService } from './user.answer.service';
import {
  CreateUserAnswerDto,
  FinishExamDto,
  UserAnswerDtoList,
} from './dto/create-user.answer.dto';
import { UpdateUserAnswerDto } from './dto/update-user.answer.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { SUPER } from 'src/auth/guards/role/role.decorator';
import { AiAgentGuard } from 'src/auth/guards/ai-agent/ai-agent.guard';
import { ApiParam } from '@nestjs/swagger';

@Controller('userAnswer')
export class UserAnswerController {
  constructor(private readonly userAnswerService: UserAnswerService) {}
  // @Public()
  @Post()
  async create(
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

  // Тестийг албан ёсоор дуусгана (сүлжээгээр давтагдсан ч идемпотент). Web `publish()` /
  // auto-advance нь сүүлийн хэсэгт илгээх хариулт 0 үед (бүх асуулт skip) дууддаг.
  // `create` шиг нэвтэрсэн (шалгалтын token-той) хэрэглэгчид.
  @Post('finish')
  finish(@Body() dto: FinishExamDto) {
    return this.userAnswerService.finish(dto.code);
  }

  // 0.3(b): урьд нь @Public() — userAnswer хүснэгтийг (ip, device, exam code)
  // бүтнээр нь хэн ч татах боломжтой байв. Одоо зөвхөн SUPER_ADMIN.
  @Get()
  @SUPER()
  findAll() {
    return this.userAnswerService.findAll();
  }

  // ---- Studio (pdf builder) / report-ийн зориулалттай endpoint-ууд ----
  // ВАЖНО: Эдгээрийг доорх generic ':code/:id' route-ийн ӨМНӨ зарласан учиртай.
  // Nest.js declaration order-оор route-уудыг тааруулдаг тул "report" гэх литерал
  // префиксийг эхэнд тавихгүй бол `report/...` нь `:code/:id`-д тааралцаж id-г
  // том тоо хэлбэрээр унших → "value out of range for type integer" алдаа гарна.

  // PDF generation / studio-д шаардлагатай БҮХ дата нэг хүсэлтэд.
  // exam + assessment + result (parent + children) + answers (category-аар).
  // Жишээ: GET /userAnswer/report/65042157713945110/full
  @Public()
  @UseGuards(AiAgentGuard)
  @Get('report/:code/full')
  @ApiParam({ name: 'code' })
  getReportPdfData(@Param('code') code: string) {
    return this.userAnswerService.getReportPdfData(code);
  }

  // Тухайн тестийн бүх хариултыг category-аар бүлэглэн буцаах.
  // Жишээ: GET /userAnswer/report/65042157713945110
  @Public()
  @UseGuards(AiAgentGuard)
  @Get('report/:code')
  @ApiParam({ name: 'code' })
  getReportAnswers(@Param('code') code: string) {
    return this.userAnswerService.getReportAnswers(code);
  }

  // Нэг category-ийн хариултуудыг буцаах (studio: {category:id} placeholder).
  // Жишээ: GET /userAnswer/report/65042157713945110/category/42
  @Public()
  @UseGuards(AiAgentGuard)
  @Get('report/:code/category/:categoryId')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'categoryId' })
  getAnswersByCategory(
    @Param('code') code: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.userAnswerService.getAnswersByCategory(code, categoryId);
  }

  // Нэг асуултын хариулт(ууд)-ыг буцаах (studio: {question:id} placeholder).
  // Жишээ: GET /userAnswer/report/65042157713945110/question/1879
  @Public()
  @UseGuards(AiAgentGuard)
  @Get('report/:code/question/:questionId')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'questionId' })
  getAnswerByQuestion(
    @Param('code') code: string,
    @Param('questionId') questionId: string,
  ) {
    return this.userAnswerService.getAnswerByQuestion(code, questionId);
  }

  @Public()
  @UseGuards(AiAgentGuard)
  @Get('code/code/:code')
  @ApiParam({ name: 'code' })
  findByCode(@Param('code') code: string) {
    return this.userAnswerService.findByCode(code);
  }

  // ⚠ Generic ':code/:id' route. Дээрх 'report/:code', 'code/code/:code' зэрэг
  // тодорхой prefix-тэй route-уудаас сүүлд байх ёстой.
  @Public()
  @Get(':code/:id')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string, @Param('code') code: string) {
    return this.userAnswerService.findOne(+id, code);
  }
}
