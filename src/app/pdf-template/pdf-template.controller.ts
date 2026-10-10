import { reportDbBase } from 'src/utils/report-urls';
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  Res,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Response } from 'express';
import axios from 'axios';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PdfTemplateService } from './pdf-template.service';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';
import { FileService } from 'src/file.service';
import { sendResolvedFile } from 'src/utils/send-resolved-file';
import { StudioIconDao } from './studio-icon.dao';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { AiAgentGuard } from 'src/auth/guards/ai-agent/ai-agent.guard';
import { TemplateTransferService } from './template-transfer.service';

// Studio (PDF builder) загваруудыг хадгалах/ачаалах endpoint-ууд.
// Frontend: studio/app/api/templates/route.ts, studio/app/api/templates/[id]/route.ts
@Controller('pdf-template')
@ApiBearerAuth('access-token')
export class PdfTemplateController {
  constructor(
    private readonly service: PdfTemplateService,
    private readonly fileService: FileService,
    private readonly iconDao: StudioIconDao,
    private readonly transfer: TemplateTransferService,
  ) {}

  // ── Studio "Icon" сан ───────────────────────────────────────────────────────
  // Upload хийсэн icon-ууд бүх тест / загварт дахин ашиглагдана. Зураг өөрөө
  // GET image/:key-ээр (Studio <img>, hire_report PDF) уншигдана.
  @Get('icons')
  listIcons() {
    return this.iconDao.list();
  }

  @Post('icons')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadIcon(@UploadedFile() file: Express.Multer.File, @Body('name') name?: string) {
    if (!file) throw new BadRequestException('Файл ирээгүй байна.');
    if (!/^image\/(png|jpe?g|webp|svg\+xml|gif)$/.test(file.mimetype || '')) {
      throw new BadRequestException('Зөвхөн зураг (png, jpg, webp, svg) оруулна уу.');
    }
    if (file.size > 2 * 1024 * 1024) throw new BadRequestException('2MB-аас ихгүй зураг оруулна уу.');
    const safe = (file.originalname || 'icon').replace(/[^\w.\-]+/g, '_').slice(-80);
    const key = `ic_${Date.now()}_${safe}`;
    await this.fileService.upload(key, file.mimetype, file.buffer, { purpose: 'studio-icon' });
    // multer нь UTF-8 файлын нэрийг latin1 гэж уншдаг ("Ð¥Ð°ÑÐ°Ð»" г.м.) — буцааж засна.
    const orig = /[\u00C0-\u00FF]/.test(file.originalname || '')
      ? Buffer.from(file.originalname, 'latin1').toString('utf8')
      : file.originalname || '';
    const label = String(name || orig).replace(/\.[a-z0-9]+$/i, '').slice(0, 255) || null;
    return this.iconDao.create(key, label);
  }

  @Put('icons/:id')
  @ApiParam({ name: 'id' })
  async renameIcon(@Param('id') id: string, @Body('name') name: string) {
    const n = String(name ?? '').trim().slice(0, 255);
    if (!n) throw new BadRequestException('Нэр хоосон байна.');
    return this.iconDao.rename(+id, n);
  }

  @Delete('icons/:id')
  @ApiParam({ name: 'id' })
  removeIcon(@Param('id') id: string) {
    return this.iconDao.remove(+id);
  }

  // Studio-ийн "Зураг блок"-д хэрэглэгчийн өөрийн зураг upload хийхэд
  // ашиглана (одоо байгаа /upload endpoint-тэй адилхан S3+local хадгалдаг
  // FileService-ийг ашиглана, гэхдээ давхарлахгүйн тулд түлхүүрт "pt_" угтвар
  // нэмнэ). Буцаах "key"-ийг доорх GET image/:key болон hire_report-ийн
  // dynamic-template.renderer.ts (эцсийн PDF зурах) хоёулаа ашиглана.
  @Post('upload-image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Файл ирээгүй байна.');
    // `/` агуулсан нэр нь `/image/:key`-ийг эвддэг тул цэвэрлэнэ (R2 түлхүүрт ч аюулгүй).
    const key = `pt_${Date.now()}_${String(file.originalname || 'image').replace(/[\/\\\0]+/g, '_').slice(-120)}`;
    await this.fileService.upload(key, file.mimetype, file.buffer, { purpose: 'studio-image' });
    return { key };
  }

  // Upload хийсэн зургийг буцаан харуулна — Studio canvas-ийн <img> preview
  // болон hire_report-ийн PDF рендэр хоёулаа энэ endpoint-ээр татаж авна.
  // @Public() — <img src="..."> browser-аас Authorization header дамжуулж
  // чаддаггүй, hire_report ч мөн server-to-server энгийн GET-ээр татна.
  // AppController.getFile()-тэй адил StreamableFile-ыг шууд буцаана (Nest
  // өөрөө урсгана) — @Res()-ийн оронд энэ нь энэ codebase-д батлагдсан хэвшил.
  @Public()
  @Get('image/:key')
  @ApiParam({ name: 'key' })
  async getImage(@Param('key') key: string, @Res() res: Response) {
    // R2-д бүртгэлтэй бол CDN руу 302 (hire_report-ийн axios redirect дагана), үгүй бол локал.
    return sendResolvedFile(this.fileService, key, res);
  }

  @Post()
  create(@Body() dto: CreatePdfTemplateDto) {
    return this.service.create(dto);
  }

  // Studio-ийн "PDF-ээр урьдчилан харах" — хадгалагдаагүй ч байж болох
  // template-ийг hire_report сервис рүү дамжуулж, demo (эсвэл dto.examCode
  // өгвөл бодит) дата ашиглан шууд PDF болгож буцаана. core нь зөвхөн relay
  // (hire_report л жинхэнэ PDF зурна) — dto бүхэлдээ дамжуулагддаг тул
  // examCode нэмэлт кодгүйгээр л дамжина.
  @Post('preview')
  async preview(
    @Body() dto: { template: any; examCode?: string },
    @Res() res: Response,
  ) {
    // v1.3.0: preview нь DB уншдаг → calc service (REPORT_CALC_URL) байвал түүн рүү.
    const REPORT = reportDbBase();
    try {
      const response = await axios.post(`${REPORT}template/preview`, dto, {
        responseType: 'arraybuffer',
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      // hire_report-оос ирсэн бодит статус (жиш нь 404 "Тест олдсонгүй")-ыг
      // алдагдуулахгүй дамжуулна — үргэлж 500 болгож нуухгүй.
      const status = error?.response?.status || 500;
      const message =
        (() => {
          try {
            const raw = error?.response?.data;
            const parsed = Buffer.isBuffer(raw)
              ? JSON.parse(raw.toString('utf-8'))
              : raw;
            return parsed?.message;
          } catch {
            return undefined;
          }
        })() ||
        error.message ||
        'PDF preview generation failed';
      res.status(status).json({ error: message });
    }
  }

  @Get()
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'assessmentId', required: false })
  findAll(
    @Query('type') type?: string,
    @Query('assessmentId') assessmentId?: string,
  ) {
    return this.service.findAll(type, assessmentId ? +assessmentId : undefined);
  }

  // ⚠ ':id' generic route-ийн ӨМНӨ байх ёстой (эс тэгвээс "categories" гэдэг
  // үгийг :id гэж уншина). AI Data tab-ийн "Асуултын/Хариултын ангилал"
  // сонголтод тухайн assessment дээр бодитоор байгаа ангиллуудыг буцаана.
  @Get('categories')
  @ApiQuery({ name: 'assessmentId', required: true })
  getCategories(@Query('assessmentId') assessmentId: string) {
    return this.service.getCategories(+assessmentId);
  }

  // AI Data tab-ийн "JSON өгөгдөл" — pdf_template мөрөөс ТУСДАА, тухайн
  // assessment дээр НЭГ удаа хадгалагдана (олон template нэг assessment
  // дээр байж болох тул давхардуулахгүй). ':id' generic route-ийн ӨМНӨ
  // байх ёстой (2 сегменттэй тул ':id'-той (1 сегмент) зөрчилдөхгүй ч
  // codebase-ийн тогтсон хэвшлийг дагана).
  // Тестийн (exam) КОД-оор нь AI JSON-ыг буцаана — жишээ нь аль хэдийн
  // өгсөн бодит тестийн код мэдэгдэж байгаа, гэхдээ assessmentId шууд
  // мэдэгдэхгүй тохиолдолд ашиглана. ':assessmentId' (мөн доорх ':id')
  // generic route-уудын ӨМНӨ байх ёстой.
  @Get('ai-data/by-exam/:code')
  @ApiParam({ name: 'code' })
  getAiDataByExamCode(@Param('code') code: string) {
    return this.service.getAiDataByExamCode(code);
  }

  // AI agent-аас дуудагдах экспорт endpoint — тухайн assessment дээр
  // ОДОО ашиглагдаж буй (isActive) загварын aiJsonData + "Хэрэглэгчийн
  // variable"-уудыг НЭГ дор буцаана. assessmentId-аар шүүнэ (exam/code биш) —
  // энэ дата assessment-ийн түвшинд тодорхойлогддог, тухайн тестийг өгсөн
  // хүн бүрд адилхан. Хэрэглэгчийн JWT биш — AiAgentGuard-аар (core/.env-ийн
  // AI_AGENT_KEY) шалгагдана, @Public() нь global JwtAuthGuard-ыг алгасна.
  // ':id' зэрэг generic route-уудын ӨМНӨ байх ёстой.
  @Public()
  @UseGuards(AiAgentGuard)
  @ApiSecurity('ai-agent-key')
  @ApiHeader({
    name: 'x-ai-agent-key',
    description: 'A custom security token or track ID',
    required: true,
    schema: { type: 'string', example: '488dc7d5ae43e8f90849a8e8d8ce96b2659ff8dbe792b526' },
  })
  @Get('ai-export/:assessmentId')
  @ApiParam({ name: 'assessmentId' })
  getAiExport(@Param('assessmentId') assessmentId: string) {
    return this.service.getAiExportByAssessmentId(+assessmentId);
  }

  // Тухайн assessment дээр PDF report generation аль замаар (Studio-ийн
  // dynamic template, эсвэл hardcoded ReportType) явахыг буцаана — жинхэнэ
  // рендэр хийхгүй (энэ codebase PDF зурдаггүй, hire_report л зурна), зөвхөн
  // ямар зам сонгогдохыг ТОДОРХОЙЛНО. Studio-ийн UI-д "энэ тест идэвхтэй
  // template ашиглаж байна / hardcoded '<type>' ашиглаж байна" гэсэн статус
  // харуулах, эсвэл дэмжлэгийн үед аль assessment template-гүй үлдсэнийг
  // шалгахад хэрэглэгдэнэ. ':id' generic route-ийн ӨМНӨ байх ёстой.
  @Get('resolve/:assessmentId')
  @ApiParam({ name: 'assessmentId' })
  resolveRenderTarget(@Param('assessmentId') assessmentId: string) {
    return this.service.resolveRenderTarget(+assessmentId);
  }

  // Studio-ийн "Хэрэглэгчийн variable" — тухайн assessment дээр хэрэглэгчийн
  // өөрөө нэрлэж үүсгэсэн key->утга map-уудын CRUD (жиш нь
  // "characterDescription": {d: "...", i: "...", ...}). ':assessmentId'/
  // ':id' generic route-уудын ӨМНӨ байх ёстой.
  @Get('variables/:assessmentId')
  @ApiParam({ name: 'assessmentId' })
  getVariables(@Param('assessmentId') assessmentId: string) {
    return this.service.getVariables(+assessmentId);
  }

  @Put('variables/:assessmentId/:key')
  @ApiParam({ name: 'assessmentId' })
  @ApiParam({ name: 'key' })
  saveVariable(
    @Param('assessmentId') assessmentId: string,
    @Param('key') key: string,
    @Body()
    dto: {
      label?: string;
      entries: Record<string, string>;
      kind?: 'map' | 'score' | 'formula' | 'skip';
      rules?: any;
    },
  ) {
    return this.service.saveVariable(
      +assessmentId,
      key,
      dto.label,
      dto.entries,
      dto.kind,
      dto.rules,
    );
  }

  @Delete('variables/:assessmentId/:key')
  @ApiParam({ name: 'assessmentId' })
  @ApiParam({ name: 'key' })
  deleteVariable(
    @Param('assessmentId') assessmentId: string,
    @Param('key') key: string,
  ) {
    return this.service.deleteVariable(+assessmentId, key);
  }

  @Get('ai-data/:assessmentId')
  @ApiParam({ name: 'assessmentId' })
  getAiData(@Param('assessmentId') assessmentId: string) {
    return this.service.getAiData(+assessmentId);
  }

  @Put('ai-data/:assessmentId')
  @ApiParam({ name: 'assessmentId' })
  saveAiData(
    @Param('assessmentId') assessmentId: string,
    @Body() dto: { data: Record<string, any> },
  ) {
    return this.service.saveAiData(+assessmentId, dto.data);
  }

  // ── Загварыг ДАНГААР нь орчин хооронд зөөх (test ↔ prod) ─────────────────────
  // test Studio → "JSON татах" → prod Studio → "JSON-оос оруулах" (тест сонгоно).
  // Асуултын ID-г гарын үсгээр (бүлэг + текст → текст → байрлал) хөрвүүлнэ,
  // хувьсагч (assessment_variable) ба Studio зургууд хамт зөөгдөнө.
  @Get(':id/export')
  @ApiParam({ name: 'id' })
  @ApiQuery({ name: 'files', required: false })
  exportTemplate(@Param('id') id: string, @Query('files') files?: string) {
    return this.transfer.exportTemplate(+id, { includeFiles: files !== '0' });
  }

  @Post('import')
  importTemplate(@Body() body: { bundle: any; assessmentId: number; activate?: boolean; variables?: 'upsert' | 'missing' | 'none' }) {
    return this.transfer.importTemplate(body);
  }

  @Get(':id')
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Put(':id')
  @ApiParam({ name: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdatePdfTemplateDto) {
    return this.service.update(+id, dto);
  }

  // Report generation-д ашиглах загварыг тэмдэглэнэ (тухайн assessment дээрх
  // бусад бүх загвар автоматаар idle болно).
  @Patch(':id/activate')
  @ApiParam({ name: 'id' })
  activate(@Param('id') id: string) {
    return this.service.setActive(+id);
  }

  // Идэвхгүй болгох — тухайн assessment дахин кодоор бичсэн (хуучин) тайлан
  // ашиглана.
  @Patch(':id/deactivate')
  @ApiParam({ name: 'id' })
  deactivate(@Param('id') id: string) {
    return this.service.setInactive(+id);
  }

  @Delete(':id')
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
