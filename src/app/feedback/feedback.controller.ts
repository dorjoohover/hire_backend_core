import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { ContactDto, CreateFeedbackDto } from './dto/create-feedback.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ContactDao } from './contact.dao';
import { Role } from 'src/auth/guards/role/role.enum';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

@ApiTags('Feedback')
@Controller('feedback')
@ApiBearerAuth('access-token')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly contact: ContactDao,
  ) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() { user }) {
    return this.feedbackService.create(createFeedbackDto, +user['id']);
  }
  @Public()
  @Post('contact')
  createContact(@Body() dto: ContactDto) {
    return this.contact.create(dto);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Get('contact')
  @PQ(['type'])
  getContact(@Pagination() pg: PaginationDto) {
    return this.contact.getAll(pg);
  }
  @Get('all')
  @PQ(['assessment', 'type'])
  async findAll(@Pagination() pg: PaginationDto) {
    const [res, count] = await this.feedbackService.findAll(pg);
    return {
      data: res,
      total: count,
    };
  }
  @Public()
  @Get('status/:assessment')
  @ApiParam({ name: 'assessment' })
  findBy(@Param('assessment') assessment: number) {
    return this.feedbackService.findStatus(assessment);
  }

  @Get('one/:id')
  findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(+id);
  }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateFeedbackDto: UpdateFeedbackDto,
  // ) {
  //   return this.feedbackService.update(+id, updateFeedbackDto);
  // }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.feedbackService.remove(+id);
  }
}
