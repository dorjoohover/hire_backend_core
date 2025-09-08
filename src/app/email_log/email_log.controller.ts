import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EmailLogService } from './email_log.service';
import { CreateEmailLogDto } from './dto/create-email_log.dto';
import { UpdateEmailLogDto } from './dto/update-email_log.dto';

@Controller('email_log')
export class EmailLogController {
  constructor(private readonly emailLogService: EmailLogService) {}

  @Post()
  create(@Body() createEmailLogDto: CreateEmailLogDto) {
    return this.emailLogService.create(createEmailLogDto);
  }

  @Get()
  findAll() {
    return this.emailLogService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emailLogService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmailLogDto: UpdateEmailLogDto,
  ) {
    return this.emailLogService.update(+id, updateEmailLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emailLogService.remove(+id);
  }
}
