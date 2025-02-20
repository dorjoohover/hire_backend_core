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
import { CreatePaymentDto } from './dto/create-payment.dto';
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

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Get('/view/:method/:role/:page/:limit')
  @ApiParam({ name: 'method' })
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  @ApiParam({ name: 'role' })
  findAll(
    @Param('method') method: string,
    @Param('page') page: string,
    @Param('limit') limit: string,
    @Param('role') role: string,
  ) {
    return this.paymentService.findAll(+method, +role, +page, +limit);
  }

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Get('/charge/:id/:amount')
  @ApiParam({
    name: 'id',
  })
  @ApiParam({
    name: 'amount',
  })
  findOne(
    @Param('id') id: string,
    @Param('amount') amount: string,
    @Request() { user },
  ) {
    return this.paymentService.charge(+id, +amount, '', +user['id']);
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
