import { Injectable } from '@nestjs/common';
import {
  Between,
  DataSource,
  In,
  IsNull,
  Like,
  Not,
  Repository,
} from 'typeorm';
import { UserEntity } from 'src/app/user/entities/user.entity';
import { UpdateDateDto } from 'src/app/user.service/dto/update-user.service.dto';
import { AssessmentDao } from 'src/app/assessment/dao/assessment.dao';
import { EmailLogEntity } from './email_log.entity';
import { EmailLogDto } from './email_log.dto';
import { EmailLogStatus } from 'src/base/constants';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class EmailLogDao {
  private db: Repository<EmailLogEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(EmailLogEntity);
  }

  create = async (dto: EmailLogDto, user?: UserEntity) => {
    const res = this.db.create({
      ...dto,
    });
    await this.db.save(res);
    return res.id;
  };

  count = async () => {
    return await this.db.count();
  };

  updateStatus = async (id: number, status: EmailLogStatus, error?: string) => {
    const res = await this.db.findOne({ where: { id } });
    await this.db.save({ ...res, status, error });
  };

  public async findAll(pg: PaginationDto) {
    const { user, page, limit, status } = pg;
    const total = await this.db.count();
    const where: any = {};

    if (status !== undefined) {
      where.status = status;
    }
    if (user !== undefined) {
      where.user = {
        id: user,
      };
    }

    const [data, count] = await this.db.findAndCount({
      where,
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      count,
      total,
    };
  }

  delete = async (id: number) => {
    const res = await this.db.delete(id);
    return res;
  };
}
