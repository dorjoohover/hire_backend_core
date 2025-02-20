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
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';

@Controller('blog')
@ApiBearerAuth('access-token')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}
  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Post()
  create(@Body() dto: CreateBlogDto, @Request() { user }) {
    return this.blogService.create(dto, user['id']);
  }
  @Public()
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
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(+id);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: CreateBlogDto) {
    return this.blogService.update(+id, updateBlogDto);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}
