import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { QuestionRuleDao } from './dao/question.rule.dao';

// Нөхцөлт алгасах (branching) дүрмийн CRUD. Admin талаас дүрэм үүсгэж,
// засварлаж, устгана. Уншилт (exam үед) нь exam.service дотор хийгдэнэ.
class CreateQuestionRuleDto {
  targetQuestionId: number;
  dependsOnQuestionId: number;
  dependsOnAnswerId?: number;
  action?: string;
  active?: boolean;
}

@Controller('question/rule')
@ApiBearerAuth('access-token')
export class QuestionRuleController {
  constructor(private readonly dao: QuestionRuleDao) {}

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Post()
  create(@Body() dto: CreateQuestionRuleDto) {
    return this.dao.create(dto);
  }

  @Public()
  @Get()
  findAll() {
    return this.dao.findAll();
  }

  @Public()
  @Get('question/:id')
  @ApiParam({ name: 'id' })
  findByQuestion(@Param('id') id: string) {
    return this.dao.findByTargetQuestion(+id);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Delete(':id')
  @ApiParam({ name: 'id' })
  delete(@Param('id') id: string) {
    return this.dao.deleteOne(+id);
  }
}
