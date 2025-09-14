import { Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { DataSource, Not, Raw, Repository } from 'typeorm';
import { BlogEntity } from './entities/blog.entity';
import { FileService } from 'src/file.service';
import { PaginationDto } from 'src/base/decorator/pagination';

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
  public async findAll(pg: PaginationDto, user?: number) {
    const { type, page, limit, name } = pg;
    const total = await this.db.count();
    let where: any = {};
    if (user) {
      where.user = { id: user };
    }
    if (type && type != 0) {
      where.category = type;
    }
    if (name) {
      where.name = Raw((alias) => `LOWER(${alias}) = :name`, {
        name: name.toLowerCase(),
      });
    }

    const [data, count] = await this.db.findAndCount({
      where: {
        category: type == 0 ? Not(type) : type,
      },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: {
        pinned: 'asc',
        createdAt: 'desc',
      },
    });
    return {
      data,
      count,
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
