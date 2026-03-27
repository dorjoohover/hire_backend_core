import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { CreateAssessmentLevelDto } from './dto/create.assessment.level.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

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
  @PQ(['type', 'status', 'name', 'category', 'createdUser'])
  @Get('all')
  async findAll(@Pagination() pg: PaginationDto, @Request() req) {
    console.log('USER:', req.user);
    const user = req.user || null;
    const res = await this.assessmentService.findAll(pg, user);

    return res;
  }

  @Public()
  @Get('new')
  @ApiQuery({ name: 'page', required: true, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, example: 10 })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: Number })
  @ApiQuery({ name: 'createdUser', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: true,
    enum: ['updatedAt', 'price', 'count', 'completeness'],
    example: 'updatedAt',
  })
  @ApiQuery({
    name: 'sortDir',
    required: true,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  findNew(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('name') name?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('createdUser') createdUser?: string,
    @Query('sortBy') sortBy: string = 'updatedAt',
    @Query('sortDir') sortDir: string = 'DESC',
  ) {
    return this.assessmentService.findNew(
      +page,
      +limit,
      {
        name,
        category: category ? +category : undefined,
        status: status ? +status : undefined,
        type: type ? +type : undefined,
        createdUser: createdUser ? +createdUser : undefined,
      },
      sortBy as any,
      sortDir.toUpperCase() as 'ASC' | 'DESC',
    );
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
