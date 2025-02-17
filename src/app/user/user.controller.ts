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
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateOtp, CreateUserDto, PasswordDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/guards/role/role.decorator';
import { Role } from 'src/auth/guards/role/role.enum';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(Role.super_admin)
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.addUser(dto);
  }

  @Post('email')
  @Public()
  sendOpt(@Body() dto: CreateOtp) {
    return this.userService.sendConfirmMail(dto.email);
  }

  @Public()
  @Get('email/confirm/:email')
  @ApiParam({ name: 'email' })
  verifyEmail(@Param('email') email: string, @Res() res) {
    try {
      this.userService.verifyMail(email);
      return res.redirect('https://hire.mn/auth/signin');
    } catch (error) {
      return res.redirect('https://hire.mn/auth/signin');
    }
  }

  @Public()
  @Get()
  findAll() {
    return this.userService.getAll();
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
    if (user.forget == +code) {
      return true;
    }
    return false;
  }
  @Public()
  @Post('forget/password')
  updatePassword(@Body() dto: PasswordDto) {
    return this.userService.updatePassword(dto.email, dto.password)
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
