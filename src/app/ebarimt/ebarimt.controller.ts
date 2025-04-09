import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EbarimtService } from './ebarimt.service';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';

@Controller('ebarimt')
export class EbarimtController {
  constructor(private readonly service: EbarimtService) {}
  @Public()
  @Get('token')
  async getToken() {
    const userId = 'user-123';

    // Send request to microservice
    const res = await this.service.some(userId);

    return res;
  }
  //   @MessagePattern('generate_token')
  //   async generate({ userId }: { userId: string }) {
  //     return await this.service.some(userId);
  //   }
}
