import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SUPER } from 'src/auth/guards/role/role.decorator';
import { OpsGuard } from './ops.guard';
import { OPS_MAX_PDF_BYTES, OpsActor, OpsService } from './ops.service';

const actorOf = (req: any): OpsActor => ({
  id: req?.user?.id,
  email: req?.user?.email,
  ip:
    String(req?.headers?.['x-forwarded-for'] ?? '')
      .split(',')[0]
      .trim() ||
    req?.ip ||
    undefined,
});

// №14: тайлангийн ops. Бүгд super admin (эсвэл OPS_ROLES) + OpsGuard. Мутаци нь
// зөвхөн POST/PUT (урьдын GET /exam/recalculate шиг GET-ээр биш).
@SUPER()
@UseGuards(OpsGuard)
@Controller('ops')
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Get('report/:code')
  status(@Param('code') code: string) {
    return this.ops.status(code);
  }

  @Get('log')
  log(@Query('code') code?: string, @Query('limit') limit?: string) {
    return this.ops.recent(code, limit ? Number(limit) : 50);
  }

  @Post('report/:code/recalculate')
  recalculate(
    @Param('code') code: string,
    @Req() req: any,
    @Body() body: { notify?: boolean },
  ) {
    return this.ops.trigger(actorOf(req), code, 'recalculate', {
      notify: !!body?.notify,
    });
  }

  @Post('report/:code/regenerate')
  regenerate(
    @Param('code') code: string,
    @Req() req: any,
    @Body() body: { notify?: boolean },
  ) {
    return this.ops.trigger(actorOf(req), code, 'regenerate', {
      notify: !!body?.notify,
    });
  }

  @Post('report/:code/retry')
  retry(@Param('code') code: string, @Req() req: any) {
    return this.ops.trigger(actorOf(req), code, 'retry');
  }

  // multipart: file (PDF), sha256? (сонголт)
  @Put('report/:code/pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: OPS_MAX_PDF_BYTES, files: 1 },
    }),
  )
  uploadPdf(
    @Param('code') code: string,
    @Req() req: any,
    @UploadedFile() file: { buffer: Buffer },
    @Body() body: { sha256?: string },
    @Headers('x-content-sha256') headerSha?: string,
  ) {
    return this.ops.uploadPdf(actorOf(req), code, file, body?.sha256 ?? headerSha);
  }
}
