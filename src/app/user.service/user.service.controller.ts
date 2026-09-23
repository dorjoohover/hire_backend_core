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
      +user['role'],
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
  getPublicQr(
    @Param('id') id: string,
    @Request() { user },
    @Query('expires') expires?: string,
  ) {
    return this.userServiceService.generatePublicQr(
      +id,
      { id: +user['id'], role: +user['role'] },
      expires,
    );
  }

  /**
   * №6: service бүрийн "дууссаны дараа үр дүн харуулах" тохиргоо (assessment-ийг глобалаар өөрчлөхгүй).
   * Body: { showResult: boolean | null } — null = assessment-ийн default.
   */
  @Roles(Role.organization, Role.admin, Role.super_admin, Role.tester)
  @Patch(':id/show-result')
  @ApiParam({ name: 'id' })
  setShowResult(
    @Param('id') id: string,
    @Body() body: { showResult?: boolean | null },
    @Request() { user },
  ) {
    return this.userServiceService.setShowResult(
      +id,
      body?.showResult === undefined ? undefined : body.showResult,
      { id: +user['id'], role: +user['role'] },
    );
  }

  /**
   * №8: "Эрх нэмэх". Байгууллага (эзэмшигч) — wallet-аас атомар хасна; admin / super_admin — үнэгүй (гараар, аудиттай).
   * Body: { count: number }.
   */
  @Roles(Role.organization, Role.admin, Role.super_admin)
  @Post(':id/topup')
  @ApiParam({ name: 'id' })
  topUp(
    @Param('id') id: string,
    @Body() body: { count?: number },
    @Request() { user },
  ) {
    return this.userServiceService.topUp(+id, body?.count, {
      id: +user['id'],
      role: +user['role'],
    });
  }

  /**
   * Public хуудаснаас шалгалтын нэр, байгууллагын нэрийг авна (нэвтрэлтгүй).
   */
  @Public()
  @Get(':id/public-info')
  @ApiParam({ name: 'id' })
  getPublicInfo(
    @Param('id') id: string,
    @Query('expires') expires?: string,
    @Query('sig') sig?: string,
  ) {
    return this.userServiceService.getPublicServiceInfo(+id, { expires, sig });
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
    @Body()
    dto: {
      firstname: string;
      lastname: string;
      email?: string;
      phone?: string;
      // №8: хугацаатай QR-ийн гарын үсэгтэй параметрүүд (URL-аас дамжина)
      expires?: string | number;
      sig?: string;
    },
  ) {
    const { expires, sig, ...person } = dto ?? ({} as any);
    return this.userServiceService.createPublicExam(+id, person, {
      expires,
      sig,
    });
  }
}
