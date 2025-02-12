import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { BaseService } from 'src/base/base.service';
import { DataSource, Db, Repository } from 'typeorm';
import { FeedbackEntity } from './entities/feedback.entity';

@Injectable()
export class FeedbackService extends BaseService {
  private _db: Repository<FeedbackEntity>;

  constructor(private dataSource: DataSource) {
    super();

    this._db = this.dataSource.getRepository(FeedbackEntity);
  }
  public async create(dto: CreateFeedbackDto, user: number) {
    const res = await this._db.create({
      ...dto,
      user: {
        id: user,
      },
    });
    return this._db.save(res);
  }

  public async findAll(type: number, page: number, limit: number) {
    return await this._db.find({
      where: {
        type,
      },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  public async findOne(id: number) {
    return await this._db.findOne({
      where: {
        id,
      },
    });
  }

  public async remove(id: number) {
    return await this._db.delete(id);
  }
}
