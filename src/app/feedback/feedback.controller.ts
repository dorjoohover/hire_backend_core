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
import { ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('Fxeedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  create(@Body() createFeedbackDto: CreateFeedbackDto, @Request() { user }) {
    return this.feedbackService.create(createFeedbackDto, +user['id']);
  }

  @Get('all/:type/:/page/:limit')
  @ApiParam({ name: 'type' })
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  findAll(
    @Param('type') type: number,
    @Param('page') page: number,
    @Param('limit') limit: number,
  ) {
    return this.feedbackService.findAll(type, page, limit);
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
