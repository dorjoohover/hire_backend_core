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
      return res.redirect(`${process.env.WEB || "https://hire.mn"}/auth/signin?email=${email}`);
    } catch (error) {
      return res.redirect(`${process.env.WEB || "https://hire.mn"}/auth/signin`);
    }
  }

  // ⚠️ Өмнө нь @Public байсан — нэвтрэлтгүйгээр БҮХ хэрэглэгчийн и-мэйл,
  // байгууллагын регистр зэрэг хувийн мэдээллийг хуудаслан татах боломжтой
  // байв. Зөвхөн админ/тестерийн эрхээр хязгаарлав.
  @Roles(Role.admin, Role.tester, Role.super_admin)
  @ApiBearerAuth('access-token')
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
  // 🔐 Нууц үг сэргээх. Серверийн талд OTP-г ЗААВАЛ шалгана —
  // өмнө нь код шалгалтгүй байсан тул дурын бүртгэл дээр нууц үг солих
  // (бүрэн account takeover) боломжтой байв.
  @Public()
  @Post('forget/password')
  updatePassword(@Body() dto: PasswordDto) {
    return this.userService.resetPasswordWithOtp(
      dto.email,
      dto.password,
      dto.code,
    );
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

  /**
   * ⚠️ Өмнө нь @Public байсан: нэвтрэлтгүйгээр дурын хэрэглэгчийн мөрийг
   * (role, wallet, password зэргийг оруулаад) шинэчлэх боломжтой байсан —
   * өөрөөр хэлбэл `PATCH /user/1 {"role":40}` гэж super_admin болох
   * боломжтой байв. Одоо: нэвтэрсэн байх ёстой, зөвхөн ӨӨРИЙН бүртгэлээ
   * (эсвэл админ бол хэнийхийг ч) засна, мөн эмзэг талбаруудыг үл хүлээнэ.
   */
  @ApiBearerAuth('access-token')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: CreateUserDto,
    @Request() { user },
  ) {
    const isAdmin = [Role.admin, Role.tester, Role.super_admin].includes(
      +user?.role,
    );
    if (!isAdmin && +user?.id !== +id) {
      throw new HttpException(
        'Зөвхөн өөрийн бүртгэлээ засах боломжтой.',
        HttpStatus.FORBIDDEN,
      );
    }

    const { role, wallet, password, emailVerified, forget, ...safe } =
      (updateUserDto ?? {}) as any;

    // role-ыг зөвхөн super_admin өөрчилнө.
    const body = +user?.role === Role.super_admin ? updateUserDto : safe;

    return this.userService.update(+id, body as CreateUserDto);
  }

  // ⚠️ Өмнө нь @Public байсан — хэн ч дурын хэрэглэгчийг устгах боломжтой байв.
  @ApiBearerAuth('access-token')
  @Roles(Role.super_admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
