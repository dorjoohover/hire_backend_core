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
import { Response } from 'express';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
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

  // @Public()
  @Get('/pdf/:code')
  @ApiParam({ name: 'code' })
  async requestPdf(@Param('code') code: string, @Request() { user }) {
    const filename = `report-${code}.pdf`;
    try {
      const visible = await this.examService.checkExam(+code);
      if (user['role'] == Role.client && !visible) {
        throw new HttpException('Хандах эрхгүй байна', HttpStatus.BAD_REQUEST);
      }
      const file = await this.fileService.getFile(filename);
      return file;
    } catch (error) {
      throw new HttpException(
        error?.message ?? 'Та түр хүлээнэ үү.',
        HttpStatus.BAD_REQUEST,
      );
    }
    // const filePath = join(this.cachePath, filename);
    // const role = user?.['role']; // from passport or middleware

    // try {
    //   const doc = await this.examService.getPdf(+code, role); // PDFKit document

    //   // Create three output channels
    //   const fileWriter = createWriteStream(filePath);
    //   const resStream = new PassThrough(); // to pipe to HTTP response
    //   const s3Stream = new PassThrough(); // to upload to S3

    //   // Pipe once, split to others
    //   doc.pipe(resStream); // stream output into resStream only once
    //   doc.end();

    //   // Pipe the pass-through to multiple places
    //   resStream.pipe(res); // 1. To user response
    //   resStream.pipe(fileWriter); // 2. Save locally
    //   resStream.pipe(s3Stream); // 3. Upload to S3

    //   // Set headers before piping
    //   res.setHeader('Content-Type', 'application/pdf');
    //   res.setHeader(
    //     'Content-Disposition',
    //     `attachment; filename="${filename}"`,
    //   );

    //   // Upload to S3
    //   const s3 = new AWS.S3({
    //     accessKeyId: process.env.AWS_ACCESS_KEY,
    //     secretAccessKey: process.env.AWS_SECRET_KEY,
    //     region: process.env.AWS_REGION,
    //   });

    //   s3.upload(
    //     {
    //       Bucket: process.env.AWS_BUCKET_NAME,
    //       Key: filename,
    //       Body: s3Stream,
    //       ContentType: 'application/pdf',
    //     },
    //     (err, data) => {
    //       if (err) {
    //         console.error('S3 upload error:', err);
    //       } else {
    //         console.log('Uploaded to S3:', data.Location);
    //       }
    //     },
    //   );
    // } catch (err) {
    //   console.error('Error generating or streaming PDF:', err);
    //   if (!res.headersSent) {
    //     res.status(500).send('Failed to generate PDF');
    //   }
    // }
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
