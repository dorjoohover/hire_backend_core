import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  CreateOtp,
  CreateUserDto,
  EmailSend,
  PasswordDto,
} from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';
import { AuthService } from 'src/auth/auth.service';
import { PQ } from 'src/base/decorator/use-pagination-query.decorator';
import { PaginationDto } from 'src/base/decorator/pagination';
import { Pagination } from 'src/base/decorator/pagination.decorator';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Roles(Role.super_admin)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }
  @Roles(Role.super_admin)
  @Get('admin/:id/:role')
  addAdmin(@Param('id') id: string, @Param('role') role: string) {
    return this.userService.update(+id, { email: null, role: +role });
  }

  @Post('email')
  @Public()
  send(@Body() dto: EmailSend) {
    return this.userService.sendConfirmMail(dto.email);
  }
  @Post('password')
  @ApiBearerAuth('access-token')
  async sendOpt(@Body() dto: CreateOtp, @Request() { user }) {
    const validate = await this.authService.validateUser(
      user.email,
      dto.oldPassword,
    );
    if (validate == 0)
      throw new HttpException(
        'Хуучин нууц үг тохирохгүй байна.',
        HttpStatus.BAD_REQUEST,
      );
    await this.userService.updatePassword(user.email, dto.password);
  }

  @Public()
  @Get('email/confirm/:email')
  @ApiParam({ name: 'email' })
  verifyEmail(@Param('email') email: string, @Res() res) {
    try {
      this.userService.verifyMail(email);
      return res.redirect(`https://hire.mn/auth/signin?email=${email}`);
    } catch (error) {
      return res.redirect('https://hire.mn/auth/signin');
    }
  }

  @Public()
  @Get()
  @PQ(['role', 'email', 'orgName', 'firstname', 'orgRegister'])
  findAll(@Pagination() pg: PaginationDto) {
    return this.userService.getAll(pg);
  }

  @Public()
  @Get('forget/send/:email')
  @ApiParam({ name: 'email' })
  forgetPassword(@Param('email') email: string) {
    return this.userService.sendOtp(email);
  }
  @Public()
  @Get('forget/verify/:code/:email')
  @ApiParam({ name: 'code' })
  @ApiParam({ name: 'email' })
  async verifyCode(@Param('code') code: string, @Param('email') email: string) {
    const user = await this.userService.getUser(email);
    if (user.forget == code) {
      return true;
    }
    return false;
  }
  @Public()
  @Post('forget/password')
  updatePassword(@Body() dto: PasswordDto) {
    return this.userService.updatePassword(dto.email, dto.password);
  }

  @ApiBearerAuth('access-token')
  @Get('get/me')
  me(@Request() { user }) {
    return user;
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.getUser(id);
  }

  @Public()
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: CreateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @Public()
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
