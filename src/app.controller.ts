import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './auth/guards/jwt/jwt-auth-guard';
import { BaseService } from './base/base.service';
import { AuthService } from './auth/auth.service';
import { LoginUserDto } from './auth/auth.dto';

@ApiTags('Main')
@Controller()
export class AppController extends BaseService {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {
    super();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Public()
  @Post('login')
  async login(@Body() dto: LoginUserDto) {
    return await this.authService.login(dto);
  }
}
