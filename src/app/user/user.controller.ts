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
import { CreateOtp, CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Public } from 'src/auth/guards/jwt/jwt-auth-guard';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
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
    this.userService.verifyMail(email);
    return res.redirect('http://localhost:3000/docs');
  }

  @Public()
  @Get()
  findAll() {
    return this.userService.getAll();
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
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
