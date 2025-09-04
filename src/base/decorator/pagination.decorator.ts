import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PaginationDto } from './pagination';

export const Pagination = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PaginationDto => {
    const request = ctx.switchToHttp().getRequest();
    return new PaginationDto(request.query);
  },
);
