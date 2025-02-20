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
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { ApiParam } from '@nestjs/swagger';

@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  create(@Body() dto: CreateBlogDto, @Request() { user }) {
    return this.blogService.create(dto, user['id']);
  }

  @Get('all/:type/:limit/:page')
  @ApiParam({ name: 'limit' })
  @ApiParam({ name: 'type' })
  @ApiParam({ name: 'page' })
  findAll(
    @Param('type') type: string,
    @Param('limit') limit: number,
    @Param('page') page: number,
  ) {
    return this.blogService.findAll(+type, limit, page);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: CreateBlogDto) {
    return this.blogService.update(+id, updateBlogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}
