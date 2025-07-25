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
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';

@Controller('assessment')
@ApiBearerAuth('access-token')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @ApiOperation({
    summary: 'assessment uusgene',
  })
  @Post()
  create(@Body() dto: CreateAssessmentDto, @Request() { user }) {
    return this.assessmentService.create(dto, user['id']);
  }

  @Public()
  @Get()
  findAll() {
    return this.assessmentService.findAll();
  }
  @Public()
  @Get('home/page')
  findHomePage() {
    return this.assessmentService.findHomePage();
  }
  @Public()
  @Get(':id')
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.assessmentService.findOne(+id);
  }
  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateAssessmentDto,
    @Request() { user },
  ) {
    return this.assessmentService.update(+id, dto, user['id']);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentService.remove(+id);
  }

  @Delete()
  clear() {
    return this.assessmentService.clear();
  }
}
