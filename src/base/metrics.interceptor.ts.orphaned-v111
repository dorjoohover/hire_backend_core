import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Хүсэлт бүрийн хугацааг MetricsService рүү бичдэг — /health/metrics-ийн
 * "app ачаалал" (requests/sec, дундаж хариу хугацаа) хэсэгт ашиглагдана.
 * LoggingInterceptor-той адилхан бүтэцтэй, зөвхөн console.log хийхийн
 * оронд тоолуурт бичдэг.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => this.metrics.record(Date.now() - start),
        error: () => this.metrics.record(Date.now() - start),
      }),
    );
  }
}
