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
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import type { Response as ExpressRes, Response } from 'express';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from 'src/auth/guards/role/role.decorator';
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
@Controller('exam')
@ApiBearerAuth('access-token')
export class ExamController {
  private readonly cachePath = join(__dirname, '..', '..', 'cache');
  constructor(
    private readonly examService: ExamService,
    private readonly report: ReportService,
    private readonly file: FileService,
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
      );
      return res;
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  // @Public()
  @Get('/pdf/:code')
  @ApiParam({ name: 'code' })
  // for report development
  async requestPdf(
    @Param('code') code: string,
    @Request() { user },
    @NestResponse() res: ExpressRes,
  ) {
    const role = user?.['role'];
    const filename = `report-${code}.pdf`;

    // PDFKit.PDFDocument үүсгэнэ
    const doc = await this.examService.getPdf(code, role);
    await this.examService.getExamInfoByCode(code, user);

    if (doc) {
      const report = await this.report.getByCode(code);
      if (
        !report ||
        report.status === REPORT_STATUS.SENT ||
        report.status === REPORT_STATUS.COMPLETED
      ) {
        const response = await this.file.getReport(filename);

        if (!response) {
          throw new HttpException('File not found', 404);
        }

        res.setHeader(
          'Content-Type',
          response.headers['content-type'] || 'application/pdf',
        );
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        response.data.pipe(res); // ⭐ STREAM → RESPONSE
        return;
      } else if (report.status === REPORT_STATUS.UPLOADING) {
        throw new HttpException('Тайлан сервер рүү хуулж байна...', 202);
      } else if (report.status === REPORT_STATUS.CALCULATING) {
        throw new HttpException('Тайлан бодогдож байна...', 202);
      } else if (report.status === REPORT_STATUS.WRITING) {
        throw new HttpException('Тайлан PDF бичиж байна...', 202);
      } else if (report.status === REPORT_STATUS.STARTED) {
        throw new HttpException('Тайлан бодож эхэлсэн...', 202);
      }
    }
  }

  @Public()
  @Get('/recalculate/:code')
  async recalculate(@Param('code') code: number) {
    const result = await axios.get(`${process.env.REPORT}calculate/${code}`);
    return result.data;
  }
  @Public()
  @Get('/regenerate/:code')
  async regenerate(@Param('code') code: number, @Res() res: Response) {
    const url = `${process.env.REPORT}test/${code}`;
    const response = await axios.get(url, {
      responseType: 'stream', // ⬅️ stream болгож авна
    });

    // Microservice-ээс ирсэн header-уудыг дамжуулах
    res.setHeader('Content-Type', response.headers['content-type']);
    res.setHeader(
      'Content-Disposition',
      response.headers['content-disposition'],
    );
    res.setHeader('Cache-Control', 'no-store');

    // Stream-ийг хэрэглэгч рүү шууд урсгах
    response.data.pipe(res);
  }
  // async requestPdf(@Param('code') code: string, @Res() res: Response) {
  //   const filename = `report-${code}.pdf`;

  //   // (шаардлагатай бол эрх шалгалтаа энд)
  //   await this.examService.checkExam(+code);

  //   const { path, size } = await this.fileService.getFileBuf(filename);
  //   const type = (mime.lookup(filename) as string) || 'application/pdf';

  //   // Толгойг тодорхой тавина — зарим прокси/шахалтэнд зайлшгүй хэрэгтэй
  //   res.setHeader('Content-Type', type);
  //   res.setHeader('Content-Length', size.toString());
  //   res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  //   res.status(HttpStatus.OK);

  //   const stream = createReadStream(path);
  //   stream.on('open', () => {
  //     // шууд дамжуулна
  //     stream.pipe(res);
  //   });
  //   stream.on('error', (err) => {
  //     // stream алдаа гарвал 500 хэлээд хаая
  //     if (!res.headersSent) res.status(500);
  //     res.end(`Stream error: ${err?.message ?? 'unknown'}`);
  //   });
  // }

  @Public()
  @Get('exam/:code')
  @ApiParam({ name: 'code' })
  async getExamInfo(@Param('code') code: string) {
    try {
      const examInfo = await this.examService.getExamInfoByCode(code);

      if (!examInfo) {
        throw new HttpException('Exam not found', HttpStatus.NOT_FOUND);
      }

      return examInfo;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to retrieve exam info',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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

  @Post('user')
  findByUser(@Body() dto: ExamUser, @Request() { user }) {
    return this.examService.findByUser(dto.id, user['email']);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examService.remove(+id);
  }
}
