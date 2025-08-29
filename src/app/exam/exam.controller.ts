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
  Response,
} from '@nestjs/common';
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
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import type { Response as ExpressRes } from 'express';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { UpdateDateDto } from '../user.service/dto/update-user.service.dto';
import { PassThrough } from 'stream';
import AWS from 'aws-sdk';
import { join } from 'path';
import { FileService } from 'src/file.service';
@Controller('exam')
@ApiBearerAuth('access-token')
export class ExamController {
  private readonly cachePath = join(__dirname, '..', '..', 'cache');
  constructor(
    private readonly examService: ExamService,
    private readonly fileService: FileService,
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

  @Public()
  @Get('/pdf/:code')
  @ApiParam({ name: 'code' })
  // for report development
  // async requestPdf(
  //   @Param('code') code: string,
  //   @Request() { user },
  //   @Response() res: ExpressRes,
  // ) {
  //   const role = user?.['role'];
  //   const filename = `report-${code}.pdf`;

  //   // PDFKit.PDFDocument үүсгэнэ
  //   const doc = await this.examService.getPdf(+code, role);

  //   // ↓↓↓ заавал pipe-с ӨМНӨ тавина
  //   res.setHeader('Content-Type', 'application/pdf');
  //   res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  //   res.setHeader('Cache-Control', 'no-store');

  //   // Шууд хэрэглэгч рүү урсгана
  //   doc.pipe(res);
  //   doc.end();
  // }

  async requestPdf(
    @Param('code') code: string,
    @Request() { user },
    @Response() res,
  ) {
    const filename = `report-${code}.pdf`;
    console.log(code, filename, 'filenmae')
    try {
      const visible = await this.examService.checkExam(+code);
      // if (user['role'] == Role.client && !visible) {
      //   throw new HttpException('Хандах эрхгүй байна.', HttpStatus.BAD_REQUEST);
      // } 
      const file = await this.fileService.getFile(filename);
      return file;
    } catch (error) {
      throw new HttpException(
        error?.message ?? 'Та түр хүлээнэ үү.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Public()
  @Get('calculation/:id')
  @ApiParam({ name: 'id' })
  calculateExamById(@Param('id') id: string) {
    return this.examService.calculateExamById(+id, false);
  }

  @Get('exam/:id')
  findOne(@Param('id') id: string) {}

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
  @Post('all/:limit/:page')
  @ApiParam({ name: 'limit' })
  @ApiParam({ name: 'page' })
  findByAdmin(
    @Body() dto: AdminExamDto,
    @Param('limit') limit: number,
    @Param('page') page: number,
  ) {
    return this.examService.findByAdmin(dto, page, limit);
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
