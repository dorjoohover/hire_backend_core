import { reportDbBase } from 'src/utils/report-urls';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Res,
  StreamableFile,
  HttpException,
  HttpStatus,
  Response as NestResponse,
  Query,
} from '@nestjs/common';
import * as mime from 'mime-types';
import { ExamService } from './exam.service';
import {
  AdminExamDto,
  CreateExamDto,
  ExamUser,
  FindExamByCodeDto,
} from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import type { Response as ExpressRes, Response } from 'express';
import { UserEntity } from '../user/entities/user.entity';
import { ADMINS, Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { UpdateDateDto } from '../user.service/dto/update-user.service.dto';
import { PassThrough } from 'stream';
import AWS from 'aws-sdk';
import { join } from 'path';
import { FileService } from 'src/file.service';
import axios from 'axios';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';
import { ReportService } from '../report/report.service';
import { REPORT_STATUS } from 'src/base/constants';
import { ReportAccessService } from '../report-access/report-access.service';

@Controller('exam')
@ApiBearerAuth('access-token')
export class ExamController {
  private readonly cachePath = join(__dirname, '..', '..', 'cache');

  constructor(
    private readonly examService: ExamService,
    private readonly report: ReportService,
    private readonly file: FileService,
    private readonly reportAccess: ReportAccessService,
  ) {
    if (!existsSync(this.cachePath)) {
      mkdirSync(this.cachePath, { recursive: true });
    }
  }

  @Post()
  create(
    @Body() createExamDto: CreateExamDto,
    @Request() { user }: { user: UserEntity },
  ) {
    return this.examService.create(createExamDto, user);
  }

  @Public()
  @Post('code/:continue')
  @ApiParam({ name: 'continue' })
  async findByCode(
    @Param('continue') con: boolean,
    @Body() dto: FindExamByCodeDto,
  ) {
    try {
      const res = await this.examService.updateByCode(
        dto.code,
        con,
        dto.category,
        {
          from: dto.from == null ? undefined : Number(dto.from),
          complete:
            dto.complete == null
              ? undefined
              : dto.complete === true || (dto.complete as any) === 'true',
        },
      );
      return res;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStatus = (error as any)?.status || 500;
      return {
        success: false,
        message: errorMessage,
        status: errorStatus,
      };
    }
  }

  @Get('/pdf/:code')
  @ApiParam({ name: 'code' })
  async requestPdf(
    @Param('code') code: string,
    @Request() { user },
    @NestResponse() res: ExpressRes,
  ) {
    const role = user?.['role'];
    const filename = `report-${code}.pdf`;

    // 💰 Monetization: "PDF татахад төлбөртэй" / "нэг удаа үнэгүй" дүрэм.
    const access = await this.reportAccess.resolve(code, user);
    if (!access.canDownload) {
      console.log(
        `💰 [paywall/pdf] code=${code} reason=${access.reason} ` +
          `pdfPaid=${access.pdfPaid} free=${access.usedViews}/${access.freeViews} ` +
          `role=${user?.['role'] ?? '-'}`,
      );
      throw new HttpException(
        access.pdfPaid
          ? 'Тайлангийн PDF татахын тулд төлбөр төлнө үү.'
          : 'Үнэгүй харах эрх дууссан байна. Тайланг дахин харахын тулд төлбөр төлнө үү.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const doc = await this.examService.getPdf(code, role);
    await this.examService.getExamInfoByCode(code, user);

    if (doc) {
      const report = await this.report.getByCode(code);
      let fileMissing = false;
      if (
        !report ||
        report.status === REPORT_STATUS.SENT ||
        report.status === REPORT_STATUS.COMPLETED
      ) {
        const { response, missing } = await this.file.getReport(filename);

        if (!response) {
          // Тайлангийн сервер түр хариу өгөөгүй (timeout, restart, ачаалал) бол 503 —
          // web хэдэн секундийн дараа дахин оролдоно. Файл үнэхээр байхгүй бол доор
          // ensureReport шинээр гаргана.
          if (!missing) {
            throw new HttpException(
              'Тайлангийн сервер түр ачаалалтай байна.',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          }
          fileMissing = true;
        } else {
          res.setHeader(
            'Content-Type',
            String(response.headers['content-type'] || 'application/pdf'),
          );
          res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

          // 💰 Тайланг PDF-ээр нээх нь ч бас "нэг харалт" (registerView дотроо хамгаалалттай:
          // paywall унтраалттай / төлсөн / эрх дууссан бол юу ч хийхгүй, 30 мин сеанс).
          await this.reportAccess.registerView(code, access);

          response.data.pipe(res);
          return;
        }
      }

      // Бэлэн биш / алга болсон: гаргах боломжтой бол заавал гаргана (FAILED, мөргүй,
      // гацсан, файл нь алга — дараалал хамаагүй) → 202 "уншиж байна" (web 5с тутам дахин
      // асууна). Гаргах боломжгүй (тест дуусаагүй, [permanent] алдаа, 24 цагт 3 автомат
      // оролдлого дууссан) бол тодорхой алдаа. Өмнө нь FAILED → 500, мөргүй → 404 байсан.
      const decision = await this.report.ensureReport(code, report, fileMissing);
      if (decision.action === 'error') {
        throw new HttpException(decision.message, decision.status);
      }
      throw new HttpException(decision.message, 202);
    }
  }

  // 0.3(b): урьд нь @Public() байсан — хэн ч дурын кодын үр дүнг устгаж дахин
  // бодуулах/PDF татах боломжтой байв. Одоо зөвхөн админ (Bearer token).
  @ADMINS()
  @Get('/recalculate/:code')
  async recalculate(@Param('code') code: string) {
    // №14: DEPRECATED — POST /ops/report/:code/recalculate (аудит + давхар job хамгаалалттай).
    console.warn(
      `⚠️ DEPRECATED GET /exam/recalculate/${code} → POST /ops/report/${code}/recalculate ашиглана уу`,
    );
    await this.examService.deleteResult(code);
    const result = await axios.get(`${reportDbBase()}calculate/${code}`);
    return result.data;
  }

  @ADMINS()
  @Get('/regenerate/:code')
  async regenerate(@Param('code') code: string, @Res() res: Response) {
    // №14: DEPRECATED — POST /ops/report/:code/regenerate.
    console.warn(
      `⚠️ DEPRECATED GET /exam/regenerate/${code} → POST /ops/report/${code}/regenerate ашиглана уу`,
    );
    res.setHeader('Deprecation', 'true');
    const url = `${reportDbBase()}test/${code}`;
    const response = await axios.get(url, {
      responseType: 'stream',
    });

    res.setHeader(
      'Content-Type',
      String(response.headers['content-type'] || 'application/pdf'),
    );
    res.setHeader(
      'Content-Disposition',
      String(response.headers['content-disposition'] || ''),
    );
    res.setHeader('Cache-Control', 'no-store');

    response.data.pipe(res);
  }

  /**
   * Шалгуулагчийн эрхийг сэргээх (session recovery) endpoint.
   * Тест ДУУССАН эсэхээс үл хамааран token олгоно — ингэснээр хэрэглэгч
   * тестээ дуусгасны дараа хуудсаа refresh хийхэд, эсвэл тайлангийн линкээ
   * дахин нээхэд өөрийн эрхээрээ буцаж орж, тайлангаа харах боломжтой.
   */
  @Public()
  @Get('access/:code')
  @ApiParam({ name: 'code' })
  async examAccess(@Param('code') code: string) {
    const access = await this.examService.getExamAccess(code);

    let report: any = null;
    try {
      report = await this.report.getStatus(code);
    } catch (error) {
      console.error('❌ examAccess report status алдаа:', error?.message);
    }

    return {
      ...access,
      report: report
        ? { status: report.status, progress: report.progress ?? 0 }
        : null,
    };
  }

  /**
   * Сошиал сүлжээнд хуваалцах зургийг (OG image) үүсгэхэд шаардлагатай
   * ХЯЗГААРЛАГДМАЛ дата. Тайлангийн paywall энд хамаарахгүй, мөн үнэгүй
   * харалтыг ТООЛОХГҮЙ — эс бөгөөс Facebook-ийн crawler хэрэглэгчийн
   * үнэгүй харалтыг зарцуулчихна.
   */
  @Public()
  @Get('share/:code')
  @ApiParam({ name: 'code' })
  async getShareInfo(@Param('code') code: string) {
    const info: any = await this.examService.getExamInfoByCode(code);
    if (!info) {
      throw new HttpException('Exam not found', HttpStatus.NOT_FOUND);
    }
    return {
      assessmentName: info.assessmentName,
      firstname: info.firstname,
      lastname: info.lastname,
      icons: info.icons,
      type: info.type,
      point: info.point,
      total: info.total,
      result: info.result,
      value: info.value,
    };
  }

  @Public()
  @Get('exam/:code')
  @ApiParam({ name: 'code' })
  async getExamInfo(@Param('code') code: string, @Request() { user }) {
    try {
      // 💰 Monetization: үнэгүй харах эрх дууссан бол дата буцаахгүй,
      // харин front-д paywall харуулах мэдээллийг буцаана.
      const access = await this.reportAccess.resolve(code, user);

      // Paywall-ийн шийдвэрийг ил гаргана — "яагаад төлбөр нэхэж/нэхэхгүй
      // байна вэ?" гэдгийг таамаглахгүйгээр core.log-оос шууд харна.
      console.log(
        `💰 [paywall] code=${code} reason=${access.reason} ` +
          `paywall=${access.paywall} free=${access.usedViews}/${access.freeViews} ` +
          `session=${access.withinFreeSession} canView=${access.canView} ` +
          `canDownload=${access.canDownload} role=${user?.role ?? '-'}`,
      );

      // №6: үр дүн ХЭЗЭЭ Ч түгжигдэхгүй (`access.canView` үргэлж true). Төлбөр зөвхөн дэлгэрэнгүй тайлан (PDF).
      const examInfo = await this.examService.getExamInfoByCode(code, user);

      if (!examInfo) {
        throw new HttpException('Exam not found', HttpStatus.NOT_FOUND);
      }

      // №6: харалтыг ЗӨВХӨН PDF endpoint тоолно — үнэгүй үр дүн харах нь (хуучин N-удаагийн горимын)
      // үнэгүй PDF эрхийг зарцуулахгүй.
      return { ...examInfo, locked: false, access };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to retrieve exam info';
      const errorStatus =
        (error as any)?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(errorMessage, errorStatus);
    }
  }

  // Байгууллага хэрэглэгчдээ зориулж QR гаргах. Клиент QR уншаад
  // и-мэйлгүйгээр тест өгнө.
  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Get('qr/:code')
  @ApiParam({ name: 'code' })
  getQr(@Param('code') code: string) {
    return this.examService.generateQr(code);
  }

  @Get('service/:id')
  findByService(@Param('id') id: string) {
    return this.examService.findExamByService(+id);
  }

  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Patch('date/:code')
  updateDate(@Param('code') code: string, @Body() dto: UpdateDateDto) {
    return this.examService.updateDate(+code, dto);
  }

  @Roles(Role.admin, Role.tester, Role.super_admin)
  @Get('all/:limit/:page')
  @PQ(['assessment', 'email', 'startDate', 'endDate'])
  findByAdmin(@Pagination() pg: PaginationDto) {
    return this.examService.findByAdmin(pg);
  }

  @Roles(Role.admin, Role.tester, Role.super_admin)
  @Get('allNew')
  @ApiQuery({ name: 'page', required: true, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: true, type: Number, example: 10 })
  @ApiQuery({ name: 'assessment', required: false, type: Number })
  @ApiQuery({ name: 'buyer', required: false, type: Number })
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'examstatus', required: false, enum: [10, 20, 30] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: true,
    enum: [
      'createdAt',
      'userStartDate',
      'userEndDate',
      'startDate',
      'endDate',
      'email',
      'firstname',
      'lastname',
      'code',
      'visible',
      'assessmentName',
      'buyerOrganizationName',
      'examstatus',
    ],
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortDir',
    required: true,
    enum: ['ASC', 'DESC'],
    example: 'DESC',
  })
  findAllNew(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('assessment') assessment?: string,
    @Query('buyer') buyer?: string,
    @Query('email') email?: string,
    @Query('examstatus') examstatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortDir') sortDir: string = 'DESC',
  ) {
    return this.examService.findAllNew(
      +page,
      +limit,
      {
        assessment: assessment ? +assessment : undefined,
        buyer: buyer ? +buyer : undefined,
        email,
        examstatus: examstatus ? +examstatus : undefined,
        startDate,
        endDate,
      },
      sortBy as any,
      sortDir.toUpperCase() as 'ASC' | 'DESC',
    );
  }

  @Post('user')
  findByUser(@Body() dto: ExamUser, @Request() { user }) {
    return this.examService.findByUser(dto.id, user['email']);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {}

  // ── Studio: admin эрхээр туршилтын шалгалт ─────────────────────────────────
  // Шалгалтыг web-ийн жинхэнэ хуудсаар өгнө (url), дуусмагц Studio тайланг PDF-ээр
  // (хадгалахгүй) гаргаад устгана. Тоонд орохгүй, тайлан/и-мэйл үүсгэхгүй.
  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Post('studio-preview')
  createStudioPreview(@Body() dto: { assessment: number }, @Request() { user }: { user: UserEntity }) {
    return this.examService.createStudioPreview(Number(dto?.assessment), user);
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Get('studio-preview/:code')
  @ApiParam({ name: 'code' })
  studioPreviewStatus(@Param('code') code: string) {
    return this.examService.studioPreviewStatus(code);
  }

  // Studio-ийн (хадгалаагүй байж болох) template-ээр тухайн туршилтын бодит хариултаар PDF.
  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Post('studio-preview/:code/report')
  @ApiParam({ name: 'code' })
  async studioPreviewReport(
    @Param('code') code: string,
    @Body() dto: { template: any },
    @Res() res: Response,
  ) {
    try {
      const st = await this.examService.studioPreviewStatus(code);
      if (!st.finished) {
        return res.status(400).json({ error: 'Шалгалт дуусаагүй байна — эхлээд шалгалтаа дуусгана уу.' });
      }
      // v1.3.0: preview нь DB уншдаг → calc service (REPORT_CALC_URL) байвал түүн рүү.
      const REPORT = reportDbBase();
      const response = await axios.post(
        `${REPORT}template/preview`,
        { template: dto?.template, examCode: code, compute: true },
        { responseType: 'arraybuffer', timeout: 120000 },
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(Buffer.from(response.data));
    } catch (error: any) {
      const status = error?.status || error?.response?.status || 500;
      let message = error?.message || 'PDF үүсгэхэд алдаа гарлаа';
      try {
        const raw = error?.response?.data;
        const parsed = Buffer.isBuffer(raw) ? JSON.parse(raw.toString('utf-8')) : raw;
        message = parsed?.message || message;
      } catch {
        /* ignore */
      }
      return res.status(status).json({ error: message });
    }
  }

  @Roles(Role.admin, Role.super_admin, Role.tester)
  @Delete('studio-preview/:code')
  @ApiParam({ name: 'code' })
  deleteStudioPreview(@Param('code') code: string) {
    return this.examService.deleteStudioPreview(code);
  }

}
