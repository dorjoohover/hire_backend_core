import { Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { DataSource, Not, Repository } from 'typeorm';
import { BlogEntity } from './entities/blog.entity';
import { FileService } from 'src/file.service';

@Injectable()
export class BlogService {
  private db: Repository<BlogEntity>;

  constructor(
    private dataSource: DataSource,
    private fileService: FileService,
  ) {
    this.db = this.dataSource.getRepository(BlogEntity);
  }
  public async create(dto: CreateBlogDto, user: number) {
    const res = this.db.create({
      ...dto,
      user: { id: user },
    });
    await this.db.save(res);
    return res.id;
  }

  public async findAll(
    type: number,
    limit: number,
    page: number,
    user?: number,
  ) {
    const [data, total] = await this.db.findAndCount({
      where: {
        category: type == 0 ? Not(type) : type,
        user: {
          id: user ? user : Not(-1),
        },
      },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      total,
    };
  }

  public async findOne(id: number) {
    return await this.db.findOne({
      where: {
        id,
      },
      relations: ['user'],
    });
  }

  public async update(id: number, dto: CreateBlogDto) {
    const res = await this.db.update(id, { ...dto });
    return res;
  }

  public async remove(id: number) {
    const res = await this.db.delete(id);
    return res;
  }
}
