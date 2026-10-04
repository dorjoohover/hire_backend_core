import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { DefinitionCacheService } from './definition-cache.service';

/**
 * Тестийн тодорхойлолтыг өөрчилдөг controller-уудад амжилттай (GET биш) хүсэлт бүрийн дараа
 * кэшийн epoch-ийг нэмнэ. Эдгээр controller-т нийтэд нээлттэй бичилт байхгүй (admin л).
 * Урьдчилан харах / зураг upload зэрэг тодорхойлолт өөрчлөхгүй замуудыг алгасна.
 */
export const DEFINITION_CONTROLLERS = new Set([
  'answer/category',
  'assessment',
  'assessment-transfer',
  'assessmentCategory',
  'formule',
  'level',
  'pdf-template',
  'question',
  'question/answer',
  'question/rule',
]);
const SKIP_HANDLER_PATHS = /(^|\/)(preview|upload-image|icons|ai-data|ai-export)(\/|$)/;

@Injectable()
export class DefinitionCacheInterceptor implements NestInterceptor {
  constructor(private readonly cache: DefinitionCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<any>();
    const method = String(req?.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next.handle();
    const ctrlPath = String(Reflect.getMetadata('path', context.getClass()) ?? '').replace(/^\/+|\/+$/g, '');
    if (!DEFINITION_CONTROLLERS.has(ctrlPath)) return next.handle();
    const handlerPath = String(Reflect.getMetadata('path', context.getHandler()) ?? '');
    if (SKIP_HANDLER_PATHS.test(handlerPath)) return next.handle();
    return next.handle().pipe(
      tap({
        next: () => void this.cache.bump(`${method} /${ctrlPath}/${handlerPath}`.replace(/\/+$/, '')),
      }),
    );
  }
}
