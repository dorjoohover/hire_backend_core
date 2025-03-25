import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from './error-log.entity';

@Injectable()
export class ErrorLogService {
  constructor(
    @InjectRepository(ErrorLog)
    private readonly errorLogRepository: Repository<ErrorLog>,
  ) {}

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
