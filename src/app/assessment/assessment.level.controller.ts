import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AssessmentLevelService } from './assessment.level.service';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { ApiParam } from '@nestjs/swagger';

@Controller('level')
export class AssessmentLevelController {
  constructor(private readonly service: AssessmentLevelService) {}
  @Post()
  create(@Body() dto: CreateAssessmentLevelDto) {
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
