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
  CreateExamDto,
  ExamUser,
  FindExamByCodeDto,
} from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Response } from 'express';
import fs from 'fs';
import { UserEntity } from '../user/entities/user.entity';
@Controller('exam')
@ApiBearerAuth('access-token')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

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
  async requestPdf(@Res() res: Response, @Param('code') code: string) {
    let filePath: any;
    try {
      filePath = await this.examService.getPdf(+code);

      res.setHeader('Content-disposition', 'attachment; filename=output.pdf');
      res.setHeader('Content-type', 'application/pdf');

      res.sendFile(filePath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error(err);
        }
        fs.unlinkSync(filePath); // Remove the temporary PDF file
      });
    } catch (err) {
      console.log('Error generating PDF:', err);
      throw err;
    }
  }
  @Get('calculation/:id')
  @ApiParam({ name: 'id' })
  calculateExamById(@Param('id') id: string, @Request() { user }) {
    console.log(user, id);
    return this.examService.calculateExamById(+id, user);
  }

  @Get('exam/:id')
  findOne(@Param('id') id: string) {}

  @Get('service/:id')
  findByService(@Param('id') id: string) {
    return this.examService.findExamByService(+id);
  }

  @Post('user')
  findByUser(@Body() dto: ExamUser, @Request() { user }) {
    return this.examService.findByUser(dto.id, user['id']);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateExamDto: UpdateExamDto) {}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.examService.remove(+id);
  }
}
