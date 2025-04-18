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

@ApiTags('Feedback')
@Controller('feedback')
@ApiBearerAuth('access-token')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService, private readonly contact: ContactDao) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() { user }) {
    return this.feedbackService.create(createFeedbackDto, +user['id']);
  }
  @Public()
  @Post('contact')
  createContact(@Body() dto: ContactDto) {
    return this.contact.create(dto)
  }


  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Get('contact')
  getContact() {
    return this.contact.getAll()
  }
  @Get('all/:assessment/:type/:page/:limit')
  @ApiParam({ name: 'type' })
  @ApiParam({ name: 'assessment' })
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  async findAll(
    @Param('type') type: number,
    @Param('assessment') assessment: number,
    @Param('page') page: number,
    @Param('limit') limit: number,
  ) {
    const [res, count] = await this.feedbackService.findAll(
      type,
      assessment,
      page,
      limit,
    );
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
