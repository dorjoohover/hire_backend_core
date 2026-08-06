import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, MoreThan, Repository } from 'typeorm';
import { ErrorLog } from './error-log.entity';
import { PaginationDto } from 'src/base/decorator/pagination';

@Injectable()
export class ErrorLogService {
  constructor(
    @InjectRepository(ErrorLog)
    private readonly errorLogRepository: Repository<ErrorLog>,
  ) {}

  async findAll(pg: PaginationDto) {
    const { limit, page, status, method } = pg;
    const [res, count] = await this.errorLogRepository.findAndCount({
      where: {
        ...(status ? { status: +status } : {}),
        ...(method ? { method } : {}),
      },
      take: limit,
      skip: (page - 1) * limit,
      order: {
        timestamp: 'desc',
      },
    });
    const total = await this.errorLogRepository.count();
    return {
      data: res,
      count,
      total,
    };
  }

  /** `since`-ээс хойших алдааны тоо (health/metrics-ийн error-rate хэсэгт) */
  async countSince(since: Date): Promise<number> {
    return this.errorLogRepository.count({
      where: { timestamp: MoreThan(since) },
    });
  }

  /** `since`-ээс хойш, `urlPrefix`-ээр эхэлсэн route-д гарсан алдааны тоо
   * (жишээ нь: чухал flow-ийн — /exam, /userAnswer — алдааг ялгаж харах) */
  async countSinceByUrlPrefix(since: Date, urlPrefix: string): Promise<number> {
    return this.errorLogRepository.count({
      where: { timestamp: MoreThan(since), url: Like(`${urlPrefix}%`) },
    });
  }

  async logError(
    exception: Error,
    message: string,
    status: number,
    ip?: string,
    request?: any,
  ): Promise<void> {
    try {
      const errorEntry = this.errorLogRepository.create({
        message: message,
        name: exception.name,

        stack: exception.stack,
        url: request?.url || 'Unknown',
        method: request?.method || 'Unknown',
        ip: ip == '' ? null : ip,
        status,
        device: request?.headers['user-agent'] || 'Unknown',
      });
      await this.errorLogRepository.save(errorEntry);
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }
}
