import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from './auth/guards/jwt/jwt-auth-guard';
import { BaseService } from './base/base.service';
import { AuthService } from './auth/auth.service';
import { LoginBasicDto, LoginGoogleDto, LoginUserDto } from './auth/auth.dto';
import {
  CreateUserDto,
  OrganizationDto,
  OrganizationExampleDto,
  UserDto,
  UserExampleDto,
} from './app/user/dto/create-user.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createReadStream } from 'fs';
import path from 'path';

@ApiTags('Main')
@Controller()
export class AppController extends BaseService {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) {
    super();
  }
  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'basic login , google login, google authaar burguulne',
  })
  @ApiResponse({
    description: 'payload der ni access-token bolon useriin medeelel',
    status: 200,
  })
  @ApiBody({
    type: LoginUserDto,
    examples: {
      a: {
        summary: 'Basic',
        value: LoginBasicDto,
      },
      b: {
        summary: 'Google',
        value: LoginGoogleDto,
      },
    },
  })
  async login(@Body() dto: LoginUserDto) {
    return await this.authService.login(dto);
  }
  @Public()
  @ApiOperation({
    summary: 'basic register hiine butsaad utga der token ochino',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      a: {
        summary: 'Хэрэглэгч',
        value: UserExampleDto,
      },
      b: {
        summary: 'Байгууллага',
        value: OrganizationExampleDto,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'payload der ni access-token bolon useriin medeelel',
  })
  @ApiConflictResponse({ description: 'Бүртгэлтэй хэрэглэгч' })
  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    try {
      return await this.authService.register(dto);
    } catch (error) {
      return {
        success: false,
        message: error.message,
        status: error.status,
      };
    }
  }
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 8, { storage: memoryStorage() }))
  async multiFileUpload(@UploadedFiles() file: Array<Express.Multer.File>) {
    const processImage = await this.appService.processMultipleImages(file);

    return { file: processImage };
  }

  @Get('/file/:file')
  @ApiParam({ name: 'file' })
  getFile(@Param('file') filename: string): StreamableFile {
    const file = createReadStream(path.join('./data/' + filename));
    return new StreamableFile(file);
  }
}
