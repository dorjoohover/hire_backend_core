import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DefinitionCacheService } from './definition-cache.service';
import { DefinitionCacheInterceptor } from './definition-cache.interceptor';

/** v1.3.0: Global — DAO-ууд (олон module-д давхар бүртгэгддэг) шууд inject хийнэ. */
@Global()
@Module({
  providers: [
    DefinitionCacheService,
    { provide: APP_INTERCEPTOR, useClass: DefinitionCacheInterceptor },
  ],
  exports: [DefinitionCacheService],
})
export class DefinitionCacheModule {}
