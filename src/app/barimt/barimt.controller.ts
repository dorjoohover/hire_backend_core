import { Controller, Get, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BarimtService } from './barimt.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { Request } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CustomRequest extends Request {
  token?: string;
  expiredIn?: number;
}

ApiTags('ebarimt');
@Controller('barimt')
export class BarimtController {
  constructor(private service: BarimtService) {}
  @Public()
  @Post()
  async create(@Req() req: CustomRequest) {
    const res = await this.service.loginEbarimt();
    req.token = res.token;
    req.expiredIn = res.expiredIn;
    return res;
  }

  @Public()
  @Get()
  async get() {
    let dto = ''
    // return await this.service.restReceipt(dto)
  }
  // @Cron(CronExpression.EVERY_DAY_AT_1AM)
  @Cron(CronExpression.EVERY_10_SECONDS)
  async automatSender() {
    await this.service.sendData();
  }

  
  @Public()
  @Get('info')
  async getInfo() {
    return await this.service.getInformation()
  }
}
