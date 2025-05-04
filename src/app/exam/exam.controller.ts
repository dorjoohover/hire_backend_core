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
import fs, {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
  unlinkSync,
} from 'fs';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { UpdateDateDto } from '../user.service/dto/update-user.service.dto';
import { PassThrough } from 'stream';
import AWS from 'aws-sdk';
import { join } from 'path';
import axios from 'axios';
@Controller('exam')
@ApiBearerAuth('access-token')
export class ExamController {
  private readonly cachePath = join(__dirname, '..', '..', 'cache');
  constructor(private readonly examService: ExamService) {
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
  @Post('code')
  findByCode(@Body() dto: FindExamByCodeDto) {
    try {
      return this.examService.updateByCode(dto.code, dto.category);
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
  async requestPdf(
    @Res() res: Response,
    @Param('code') code: string,
    @Request() { user },
  ) {
    const filename = `report-${code}.pdf`;
    const filePath = join(this.cachePath, filename);
    const role = user?.['role'];

    // // Step 1: Check local cache
    // if (existsSync(filePath)) {
    //   const stats = statSync(filePath);
    //   const fileAge = Date.now() - stats.mtimeMs;
    //   const daysOld = fileAge / (1000 * 60 * 60 * 24);

    //   if (daysOld <= 30) {
    //     res.setHeader('Content-Type', 'application/pdf');
    //     res.setHeader(
    //       'Content-Disposition',
    //       `attachment; filename="${filename}"`,
    //     );
    //     return createReadStream(filePath).pipe(res);
    //   } else {
    //     unlinkSync(filePath); // delete old cache
    //   }
    // }

    // Step 2: Try to download from S3
    // const s3Url = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_BUCKET_NAME}/${filename}`;
    try {
      // const s3Res = await axios.get(s3Url, { responseType: 'stream' });
      const writer = createWriteStream(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      // s3Res.data.pipe(writer);
      // s3Res.data.pipe(res);

      writer.on('finish', () => {
        console.log('PDF downloaded from S3 and saved locally');
      });

      writer.on('error', (err) => {
        console.error('Error writing to file from S3:', err);
      });

      return;
    } catch (s3Err) {
      console.warn('S3 download failed, generating new PDF:', s3Err.message);
    }

    // Step 3: Generate new PDF
    try {
      const doc = await this.examService.getPdf(+code, role); // Returns PDFKit document
      const pass = new PassThrough();
      const fileWriter = createWriteStream(filePath);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      doc.pipe(pass);
      doc.pipe(res);
      doc.pipe(fileWriter);
      doc.end();

      // Upload to S3
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION,
      });

      s3.upload(
        {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: filename,
          Body: pass,
          ContentType: 'application/pdf',
        },
        (err, data) => {
          if (err) {
            console.error('S3 upload error:', err);
          } else {
            console.log('PDF uploaded to S3:', data.Location);
          }
        },
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
      res.status(500).send('Failed to generate PDF');
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
