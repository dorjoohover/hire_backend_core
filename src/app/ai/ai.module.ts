import { Module } from '@nestjs/common';
import { PdfTemplateModule } from '../pdf-template/pdf-template.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [PdfTemplateModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
