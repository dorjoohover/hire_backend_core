import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { QuestionRuleDao } from './dao/question.rule.dao';
import { QuestionRuleService } from './question.rule.service';
import { QuestionRuleAction } from './entities/question.rule.entity';

// Нөхцөлт алгасах (branching) дүрмийн CRUD. Admin талаас дүрэм үүсгэж,
// засварлаж, устгана. Уншилт (exam үед) нь exam.service дотор хийгдэнэ.
// Утгын шалгалт (өөрөө өөр рүүгээ, цикл, блокийн дараалал …) — QuestionRuleService.
class CreateQuestionRuleDto {
  @IsInt()
  @Min(1)
  targetQuestionId: number;

  @IsInt()
  @Min(1)
  dependsOnQuestionId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dependsOnAnswerId?: number | null;

  @IsOptional()
  @IsIn([QuestionRuleAction.SKIP])
  action?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

class UpdateQuestionRuleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  targetQuestionId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dependsOnQuestionId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dependsOnAnswerId?: number | null;

  @IsOptional()
  @IsIn([QuestionRuleAction.SKIP])
  action?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@Controller('question/rule')
@ApiBearerAuth('access-token')
export class QuestionRuleController {
  constructor(
    private readonly dao: QuestionRuleDao,
    private readonly service: QuestionRuleService,
  ) {}

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Post()
  create(@Body() dto: CreateQuestionRuleDto) {
    return this.service.create(dto);
  }

  // Өмнө нь @Public() байсан — дүрмийн жагсаалт нээлттэй байв. Шалгуулагчид
  // хэрэгтэй `rules`-ийг `GET exam/...` (getQuestions) өгдөг тул admin-д л хэрэгтэй.
  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Get()
  findAll() {
    return this.dao.findAll();
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Get('question/:id')
  @ApiParam({ name: 'id' })
  findByQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.dao.findByTargetQuestion(id);
  }

  // Засах / идэвхжүүлэх-унтраах (`{ active: false }`).
  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Patch(':id')
  @ApiParam({ name: 'id' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionRuleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.dao.deleteOne(id);
  }
}
