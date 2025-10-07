import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { BaseService } from 'src/base/base.service';
import { DataSource, Db, Not, Repository } from 'typeorm';
import { FeedbackEntity } from './entities/feedback.entity';
import { FeedbackType } from 'src/base/constants';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class FeedbackService extends BaseService {
  private _db: Repository<FeedbackEntity>;

  constructor(private dataSource: DataSource) {
    super();

    this._db = this.dataSource.getRepository(FeedbackEntity);
  }
  public async create(dto: CreateFeedbackDto, user?: number) {
    const res = await this._db.create({
      ...dto,
      user: user ? {
        id: user,
      } : null,
      assessment: {
        id: dto.assessment,
      },
    });
    return this._db.save(res);
  }

  public async findAll(pg: PaginationDto) {
    const { type, assessment, limit, page } = pg;
    const [data, count] = await this._db.findAndCount({
      where: {
        type,
        assessment: {
          id: assessment == 0 ? Not(0) : assessment,
        },
      },
      relations: ['assessment', 'user'],
      take: limit,
      skip: (page - 1) * limit,
      order: {
        createdAt: 'DESC',
      },
    });
    const total = await this._db.count();
    return {
      data,
      count,
      total,
    };
  }

  public async findStatus(assessment: number) {
    const res = await this._db
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status') // Specify table for status
      .addSelect('COUNT(feedback.id)', 'count')
      .where('feedback.status is not null and feedback."assessmentId" = :id', {
        id: assessment,
      })

      .groupBy('feedback.status')
      .getRawMany();

    // if (assessment !== 0) {
    //   res
    //     .innerJoin('assessment', 'ass', 'ass.id = feedback.assessmentId')
    //     .where('feedback.assessmentId = :id', { id: assessment });
    // }

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
