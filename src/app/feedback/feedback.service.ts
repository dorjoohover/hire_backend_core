import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { BaseService } from 'src/base/base.service';
import { DataSource, Db, Not, Repository } from 'typeorm';
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

  public async findAll(
    type: number,
    assessment: number,
    page: number,
    limit: number,
  ) {
    return await this._db.find({
      where: {
        type,
        assessment: {
          id: assessment == 0 ? Not(0) : assessment,
        },
      },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  public async findStatus(assessment: number) {
    const res = await this._db
      .createQueryBuilder('feedback')
      .select('status')
      .addSelect('count(id)', 'count')
      .innerJoin('assessment', 'ass', 'ass.id = "feedback"."assessmentId"');
    if (assessment != 0)
      res.where('"feedback"."assessmentId" = :id', { assessment });
    res.groupBy('status').getRawMany();

    return res;
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
