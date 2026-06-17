import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { UserServiceService } from './user.service.service';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
  SendLinkToEmail,
  SendLinkToEmails,
} from './dto/create-user.service.dto';
import {
  UpdateDateDto,
  UpdateUserServiceDto,
} from './dto/update-user.service.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

@Controller('userService')
@ApiBearerAuth('access-token')
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @Post()
  create(
    @Body() createUserServiceDto: CreateUserServiceDto,
    @Request() { user },
  ) {
    try {
      return this.userServiceService.create(createUserServiceDto, user);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  @Post('send')
  @Public()
  // @Roles(Role.organization)
  async sendCodeToEmail(@Body() dto: SendLinkToEmails) {
    try {
      const result = await this.userServiceService.sendLinkToMail(dto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error?.message || 'Failed to send invites',
        status: error?.status,
      };
    }
  }

  @Post('exam')
  async createExam(@Body() dto: CreateExamServiceDto, @Request() { user }) {
    try {
      return await this.userServiceService.createExam(
        dto,
        user['id'],
        user['role'],
      );
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }

  @Get('ebarimt/:id')
  @ApiParam({ name: 'id' })
  getEbarimt(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.getEbarimt(+id, user['email']);
  }
  @Delete('ebarimt/:id')
  @ApiParam({ name: 'id' })
  deleteEbarimt(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.deleteEbarimt(+id);
  }

  @Public()
  @Get('callback/:invoice/:user')
  @ApiParam({ name: 'invoice' })
  async handleCallback(
    @Query('qpay_payment_id') id: string,
    @Param('invoice') invoice: string,
    @Param('user') user: string,
  ): Promise<any> {
    const res = await this.userServiceService.checkCallback(
      +user,
      id,
      +invoice,
    );

    return res;
  }

  @Get('checkPayment/:id/:code')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'id' })
  checkPayment(
    @Param('id') id: string,
    @Param('code') code: string,
    @Request() { user },
  ) {
    console.log(id, code);
    return this.userServiceService.checkPayment(
      +id,
      code,
      +user['id'],
      user['email'],
    );
  }

  @PQ(['email', 'endDate', 'startDate'])
  @Get('all')
  findAll(@Pagination() pg: PaginationDto) {
    return this.userServiceService.findAll(pg);
  }
  @PQ(['sortBy', 'sortDir'])
  @Get('user/:id/invited')
  @ApiParam({ name: 'id' })
  findInvitedById(
    @Param('id') id: string,
    @Pagination() pg: PaginationDto,
    @Request() { user },
    @Query('examStatus') examStatus?: string,
  ) {
    return this.userServiceService.findInvitedByUser(
      +id,
      +user['id'],
      user['email'],
      pg,
      examStatus,
    );
  }

  @PQ(['sortBy', 'sortDir'])
  @Get('user/:id')
  @ApiParam({ name: 'id' })
  findById(
    @Param('id') id: string,
    @Pagination() pg: PaginationDto,
    @Request() { user },
    @Query('status') status?: string,
    @Query('examStatus') examStatus?: string,
  ) {
    return this.userServiceService.findByUser(
      +id,
      +user['id'],
      user['email'],
      pg,
      status !== undefined ? +status : undefined,
      examStatus,
    );
  }

  @Get('find/:id')
  findOne(@Param('id') id: string) {
    return this.userServiceService.findOne(+id);
  }

  /**
   * Байгууллагын үйлчилгээнд зориулсан public QR код үүсгэнэ.
   * QR-ийг уншсан хэн ч бүртгэл хийгээд тест эхлүүлэх боломжтой.
   */
  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Get(':id/public-qr')
  @ApiParam({ name: 'id' })
  getPublicQr(@Param('id') id: string, @Request() { user }) {
    return this.userServiceService.generatePublicQr(+id, +user['id']);
  }

  /**
   * Public хуудаснаас шалгалтын нэр, байгууллагын нэрийг авна (нэвтрэлтгүй).
   */
  @Public()
  @Get(':id/public-info')
  @ApiParam({ name: 'id' })
  getPublicInfo(@Param('id') id: string) {
    return this.userServiceService.getPublicServiceInfo(+id);
  }

  /**
   * Public QR уншиж ирсэн хэрэглэгч мэдээллээ оруулаад шинэ шалгалт эхлүүлнэ.
   * Нэвтрэлт шаардахгүй (нийтэд нээлттэй).
   */
  @Public()
  @Post(':id/public-register')
  @ApiParam({ name: 'id' })
  publicRegister(
    @Param('id') id: string,
    @Body() dto: { firstname: string; lastname: string; email?: string; phone?: string },
  ) {
    return this.userServiceService.createPublicExam(+id, dto);
  }
}
