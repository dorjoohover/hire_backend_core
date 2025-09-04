import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AdminDto, ChargePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { Pagination } from 'src/base/decorator/pagination.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';

@Controller('payment')
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // @Post()
  // create(@Body() createPaymentDto: CreatePaymentDto, @Request() { user }) {
  //   return this.paymentService.create(createPaymentDto, user['id']);
  // }

  // @Roles(Role.super_admin, Role.tester, Role.admin)
  @Get('/view')
  @PQ([
    'role',
    'id',
  ])
  findAll(@Pagination() pg: PaginationDto, @Request() { user }) {
    return this.paymentService.findAll(pg, user);
  }

  @Roles(Role.admin, Role.tester, Role.super_admin)
  @PQ([
    'role',
    'assessmentId',
    'payment',
    'assessmentName',
    'method',
    'startDate',
    'endDate',
  ])
  @Get('all')
  findByAdmin(@Pagination() pg: PaginationDto) {
    return this.paymentService.findAdmin(pg);
  }

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Post('/charge')
  findOne(@Body() dto: ChargePaymentDto, @Request() { user }) {
    return this.paymentService.charge(
      dto.id,
      dto.amount,
      dto.message,
      dto.method,
      +user['id'],
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(+id, updatePaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.paymentService.remove(+id);
  }
}
