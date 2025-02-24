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
import { ChargePaymentDto, CreatePaymentDto, DateDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';

@Controller('payment')
@ApiBearerAuth('access-token')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() { user }) {
    return this.paymentService.create(createPaymentDto, user['id']);
  }

  // @Roles(Role.super_admin, Role.tester, Role.admin)
  @Get('/view/:role/:page/:limit')
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  @ApiParam({ name: 'role' })
  findAll(
    @Param('page') page: string,
    @Param('limit') limit: string,
    @Param('role') role: string,
    @Request() { user },
  ) {
    return this.paymentService.findAll(+role, +page, +limit, user);
  }

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Post('/admin/:page/:limit')
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  findAdmin(@Body() dto: DateDto, @Param('page') page: number, @Param('limit') limit: number) {
    return this.paymentService.findAdmin(dto, page, limit);
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
