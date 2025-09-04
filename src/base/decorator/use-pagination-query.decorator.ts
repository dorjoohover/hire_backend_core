import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Q } from '../const/app.const';

export function PQ(additionalQueries?: string[]) {
  const decorators = [ApiQuery(Q.SKIP), ApiQuery(Q.PAGE)];

  if (additionalQueries?.length) {
    for (const name of additionalQueries) {
      decorators.push(ApiQuery({ name, required: false, type: String }));
    }
  }

  return applyDecorators(...decorators);
}
