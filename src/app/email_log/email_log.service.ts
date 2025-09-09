import { Injectable } from '@nestjs/common';
import { EmailLogDao } from './email_log.dao';
import { EmailLogDto } from './email_log.dto';
import { PaginationDto } from 'src/base/decorator/pagination';
import { EmailLogStatus } from 'src/base/constants';

@Injectable()
export class EmailLogService {
  constructor(private dao: EmailLogDao) {}
  public async create(dto: EmailLogDto) {
    return await this.dao.create({ ...dto, status: EmailLogStatus.PENDING });
  }

  public async findAll(pg: PaginationDto) {
    return await this.dao.findAll(pg);
  }

  public async updateStatus(
    id: number,
    status: EmailLogStatus,
    error?: string,
  ) {
    await this.dao.updateStatus(id, status, error);
  }

  public async deleteOne(id: number) {
    await this.dao.delete(id);
  }
}
