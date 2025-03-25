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
import fs from 'fs';
import { UserEntity } from '../user/entities/user.entity';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
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
  async requestPdf(
    @Res() res: Response,
    @Param('code') code: string,
    @Request() { user },
  ) {
    const role = user?.['role'];
    let filePath: any;
    try {
      filePath = await this.examService.getPdf(+code, role);

      res.setHeader('Content-disposition', 'attachment; filename=output.pdf');
      res.setHeader('Content-type', 'application/pdf');

      res.sendFile(filePath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error(err);
        }
        fs.unlinkSync(filePath); // Remove the temporary PDF file
      });
      // return res.redirect('https://hire.mn');
    } catch (err) {
      console.log('Error generating PDF:', err);
      throw err;
    }
  }
  @Get('calculation/:id')
  @ApiParam({ name: 'id' })
  calculateExamById(@Param('id') id: string, @Request() { user }) {
    return this.examService.calculateExamById(+id, false, user);
  }

  @Get('exam/:id')
  findOne(@Param('id') id: string) {}

  @Get('service/:id')
  findByService(@Param('id') id: string) {
    return this.examService.findExamByService(+id);
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
