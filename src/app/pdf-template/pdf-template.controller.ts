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
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { AiAgentGuard } from 'src/auth/guards/ai-agent/ai-agent.guard';

// Studio (PDF builder) загваруудыг хадгалах/ачаалах endpoint-ууд.
// Frontend: studio/app/api/templates/route.ts, studio/app/api/templates/[id]/route.ts
@Controller('pdf-template')
@ApiBearerAuth('access-token')
export class PdfTemplateController {
  constructor(
    private readonly service: PdfTemplateService,
    private readonly fileService: FileService,
  ) {}

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
    const key = `pt_${Date.now()}_${file.originalname}`;
    await this.fileService.upload(key, file.mimetype, file.buffer);
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
  async getImage(@Param('key') key: string) {
    return await this.fileService.getFile(key);
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
    const REPORT = process.env.REPORT || 'http://localhost:4000/api/v1/';
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
    @Body() dto: { label?: string; entries: Record<string, string> },
  ) {
    return this.service.saveVariable(
      +assessmentId,
      key,
      dto.label,
      dto.entries,
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

  @Delete(':id')
  @ApiParam({ name: 'id' })
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
