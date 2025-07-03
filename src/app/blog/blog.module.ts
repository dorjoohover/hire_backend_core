import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { FileService } from 'src/file.service';

@Module({
  imports: [],
  controllers: [BlogController],
  providers: [BlogService, FileService],
})
export class BlogModule {}
