import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ADMINS, Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

@Controller('blog')
@ApiBearerAuth('access-token')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}
  @ADMINS()
  @Post('create')
  async create(@Body() dto: CreateBlogDto, @Request() { user }) {
    return this.blogService.create(dto, user.id);
  }
  @Public()
  @PQ(['type', 'name'])
  @Get('all')
  findAll(@Pagination() pg: PaginationDto) {
    return this.blogService.findAll(pg);
  }
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(+id);
  }

  @ADMINS()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: CreateBlogDto) {
    return this.blogService.update(+id, updateBlogDto);
  }

  @ADMINS()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}
