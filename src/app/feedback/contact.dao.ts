import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { ContactEntity } from './entities/contact.entity';
import { DataSource, Repository } from 'typeorm';
import { ContactDto } from './dto/create-feedback.dto';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class ContactDao extends BaseService {
  private _db: Repository<ContactEntity>;

  constructor(private dataSource: DataSource) {
    super();

    this._db = this.dataSource.getRepository(ContactEntity);
  }

  public async create(dto: ContactDto) {
    const res = this._db.create({
      ...dto,
    });
    await this._db.save(res);
  }
  public async getAll(pg: PaginationDto) {
    const { type, limit, page } = pg;
    const [res, count] = await this._db.findAndCount({
      where: {
        type,
      },
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: 'desc',
      },
    });
    const total = await this._db.count();
    return {
      data: res,
      count,
      total,
    };
  }
}
