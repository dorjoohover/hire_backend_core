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
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Fxeedback')
@Controller('feedback')
@ApiBearerAuth('access-token')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() { user }) {
    return this.feedbackService.create(createFeedbackDto, +user['id']);
  }

  @Get('all/:assessment/:type/:page/:limit')
  @ApiParam({ name: 'type' })
  @ApiParam({ name: 'assessment' })
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  findAll(
    @Param('type') type: number,
    @Param('assessment') assessment: number,
    @Param('page') page: number,
    @Param('limit') limit: number,
  ) {
    return this.feedbackService.findAll(type, assessment, page, limit);
  }
  @Get('status/:assessment')
  @ApiParam({ name: 'assessment' })
  findBy(@Param('type') type: number) {
    return this.feedbackService.findStatus(type);
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
