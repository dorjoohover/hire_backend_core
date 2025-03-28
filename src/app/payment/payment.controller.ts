import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  ChargePaymentDto,
  CreatePaymentDto,
  DateDto,
} from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';

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
  @ApiQuery({ name: 'page' })
  @ApiQuery({ name: 'id' })
  @ApiQuery({ name: 'limit' })
  @ApiQuery({ name: 'role' })
  findAll(
    @Query('page') page: string,
    @Query('id') id: string,
    @Query('limit') limit: string,
    @Query('role') role: string,
    @Request() { user },
  ) {
    let r, p, l;
    !role ? (r = 0) : (r = +role);
    !page ? (p = 1) : (p = +page);
    !limit ? (l = 10) : (l = +limit);
    return this.paymentService.findAll(r, p, l, user, +id);
  }

  @Roles(Role.super_admin, Role.tester, Role.admin)
  @Post('/admin/:page/:limit')
  @ApiParam({ name: 'page' })
  @ApiParam({ name: 'limit' })
  findAdmin(
    @Body() dto: DateDto,
    @Param('page') page: number,
    @Param('limit') limit: number,
  ) {
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
