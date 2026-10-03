import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ADMINS } from 'src/auth/guards/role/role.decorator';
import { AssessmentTransferService } from './assessment-transfer.service';

// Тест (assessment)-ийг өөр орчин руу зөөх: test admin → "JSON татах" (export),
// prod admin → "JSON-оос оруулах" (import). Шинэ тест "Архив" төлөвтэй үүснэ.
@ApiBearerAuth('access-token')
@ADMINS()
@Controller('assessment-transfer')
export class AssessmentTransferController {
  constructor(private readonly transfer: AssessmentTransferService) {}

  @ApiOperation({ summary: 'Тестийг бүх агуулга, зурагтай нь JSON bundle болгож татах' })
  @ApiParam({ name: 'id' })
  @Get(':id/export')
  export(
    @Param('id', ParseIntPipe) id: number,
    @Query('files') files?: string,
  ) {
    return this.transfer.exportBundle(id, { includeFiles: files !== '0' });
  }

  @ApiOperation({ summary: 'JSON bundle-ээс шинэ тест (Архив төлөвтэй) үүсгэх' })
  @Post('import')
  import(@Body() body: any, @Req() req: any) {
    return this.transfer.importBundle(body, req?.user?.id, { mode: 'import' });
  }
}
