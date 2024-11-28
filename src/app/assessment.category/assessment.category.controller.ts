import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AssessmentCategoryService } from './assessment.category.service';
import {
  AssessmentCategoryExampleDto,
  AssessmentSubCategoryExampleDto,
  CreateAssessmentCategoryDto,
} from './dto/create-assessment.category.dto';
import { UpdateAssessmentCategoryDto } from './dto/update-assessment.category.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Assessment Category')
@Controller('assessmentCategory')
@ApiBearerAuth('access-token')
export class AssessmentCategoryController {
  constructor(
    private readonly assessmentCategoryService: AssessmentCategoryService,
  ) {}
  @Roles(Role.admin)
  @ApiOperation({
    summary: 'assessment-n category bolon ded category uusgene',
  })
  @ApiBody({
    type: CreateAssessmentCategoryDto,
    examples: {
      a: {
        summary: 'Category',
        value: AssessmentCategoryExampleDto,
      },
      b: {
        summary: 'Sub Category',
        value: AssessmentSubCategoryExampleDto,
      },
    },
  })
  @Post()
  async create(
    @Body() createAssessmentCategoryDto: CreateAssessmentCategoryDto,
    @Request() { user },
  ) {
    return await this.assessmentCategoryService.create(
      createAssessmentCategoryDto,
      user['id'],
    );
  }
  @Public()
  @Get()
  findAll(@Request() req) {
    // console.log(req);
    return this.assessmentCategoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assessmentCategoryService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssessmentCategoryDto: UpdateAssessmentCategoryDto,
  ) {
    return this.assessmentCategoryService.update(
      +id,
      updateAssessmentCategoryDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assessmentCategoryService.remove(+id);
  }
  @Roles(Role.admin)
  @Delete()
  delete() {
    return this.assessmentCategoryService.delete();
  }
}
