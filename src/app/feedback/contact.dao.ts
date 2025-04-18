import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/base/base.service';
import { ContactEntity } from './entities/contact.entity';
import { DataSource, Repository } from 'typeorm';
import { ContactDto } from './dto/create-feedback.dto';

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
}
