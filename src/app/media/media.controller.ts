import { Body, Controller, Get, Param, Post, Request } from '@nestjs/common';
import { MediaService } from './media.service';

// Медиа (зураг, бичлэг) — R2. Жижиг файл: хуучин POST /upload (+ purpose). Том файл (видео,
// бичлэг): 1) POST /media/presign → 2) browser шууд PUT uploadUrl → 3) POST /media/:id/complete.
// Хувийн бичлэгийг үзэх: GET /media/:id/url (эрх шалгаад 5 мин хүчинтэй холбоос).
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('presign')
  presign(
    @Request() req: any,
    @Body() body: { purpose: string; mime: string; bytes: number; filename?: string; examCode?: string },
  ) {
    return this.media.presign(body, req?.user);
  }

  @Post(':id/complete')
  complete(@Request() req: any, @Param('id') id: string) {
    return this.media.complete(id, req?.user);
  }

  @Get(':id/url')
  url(@Request() req: any, @Param('id') id: string) {
    return this.media.signedUrl(id, req?.user);
  }
}
