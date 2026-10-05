import { Global, Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

// Global: FileService (олон модульд provider) MediaService-ийг @Optional()-оор inject хийнэ.
@Global()
@Module({
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
