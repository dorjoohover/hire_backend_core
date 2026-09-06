import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto, PaymentUserDto } from './dto/create-user.dto';
import { UserDao } from './user.dao';
import * as bcrypt from 'bcryptjs';
import { CLIENT, ORGANIZATION } from 'src/base/constants';
import { PaginationDto } from 'src/base/decorator/pagination';
import { EmailService } from '../email/email.service';
export const saltOrRounds = 1;

@Injectable()
export class UserService {
  constructor(
    private dao: UserDao,
    @Inject(forwardRef(() => EmailService))
    private mailService: EmailService,
  ) {}
  async sendConfirmMail(email: string) {
    await this.mailService.sendVerification({
      email: email.toLowerCase(),
    });
  }

  public async verifyMail(email: string) {
    const res = await this.dao.verify(email, true, email);
    return res;
  }
  public async addUser(dto: CreateUserDto) {
    let user = await this.dao.getByEmail(
      dto.organizationRegisterNumber
        ? dto.organizationRegisterNumber
        : dto.email,
    );
    let password = null;

    if (dto.password) {
      password = await bcrypt.hash(dto.password, saltOrRounds);
    }
    if (dto.organizationRegisterNumber) {
      if (user) {
        throw new HttpException('Бүртгэлтэй байна.', HttpStatus.BAD_REQUEST);
      }
      if (
        !dto.organizationName ||
        !dto.lastname ||
        !dto.position ||
        !dto.password ||
        !dto.phone ||
        !dto.firstname
      ) {
        throw new HttpException(
          'Дутуу мэдээлэл оруулсан',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    const res = await this.dao.add({
      ...dto,
      password: password,
      role:
        dto.role ?? (dto.organizationRegisterNumber ? ORGANIZATION : CLIENT),
      wallet: 0,
      lastname: dto.lastname ?? '',
      firstname: dto.firstname ?? '',
      emailVerified: dto.emailVerified ?? dto.role != null,
    });
    if (!dto.emailVerified) {
      await this.sendConfirmMail(dto.email);
    }
    return res;
    // throw new HttpException('И-майл хаягаа баталгаажуулна уу', HttpStatus.FORBIDDEN);
    // return res;
  }
  public async getAll(pg: PaginationDto) {
    return await this.dao.getAll(pg);
  }

  public async sendOtp(email: string) {
    let generated = Math.floor(Math.random() * 1000000);
    const code = generated.toString().padStart(6, '0');

    await this.dao.updateByEmail({
      email,
      code,
    });
    await this.mailService.sendOtp({
      email,
      code,
    });
  }
  public async updatePassword(email: string, password: string) {
    const hashed = await bcrypt.hash(password, saltOrRounds);
    await this.dao.updateByEmail({ email, password: hashed });
  }

  /**
   * 🔐 Нууц үг сэргээх (forget) урсгал.
   *
   * ⚠️ Өмнө нь `POST /user/forget/password` нь @Public бөгөөд зөвхөн
   * { email, password } авдаг, OTP-г огт шалгадаггүй байсан. Код баталгаажуулах
   * нь ЗӨВХӨН front талд (Signin.js) хийгддэг байсан тул хэн ч дурын и-мэйл
   * (тэр дундаа super_admin) дээр нууц үгийг сольж бүрэн эрх авах боломжтой
   * байв. Одоо серверийн талд OTP-г заавал шалгана.
   */
  public async resetPasswordWithOtp(
    email: string,
    password: string,
    code: string,
  ) {
    const normalized = email?.toLowerCase();
    if (!normalized || !password || !code) {
      throw new HttpException(
        'И-мэйл, баталгаажуулах код, шинэ нууц үг шаардлагатай.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.dao.getByEmail(normalized);
    if (!user || !user.forget || `${user.forget}` !== `${code}`) {
      throw new HttpException(
        'Баталгаажуулах код буруу байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashed = await bcrypt.hash(password, saltOrRounds);
    await this.dao.updateByEmail({ email: normalized, password: hashed });
    await this.dao.updateByEmail({ email: normalized, clearForget: true });
    return true;
  }

  public async payment(dto: PaymentUserDto) {
    const user = await this.dao.get(dto.id);
    const pay = user.wallet + dto.price;
    if (pay >= 0) {
      await this.dao.update({
        id: dto.id,
        ...user,
        wallet: pay,
      });
      return false;
    } else {
      return false;
    }
  }
  findAll() {
    return `This action returns all user`;
  }

  async getUser(dto: string) {
    return await this.dao.getByEmail(dto?.toLowerCase());
  }
  public async update(id: number, dto: CreateUserDto) {
    const { email, ...body } = dto;

    return email == null
      ? await this.dao.update({ ...body, id: id })
      : await this.dao.update({ ...body, email, id: id });
  }

  public async remove(id: number) {
    return await this.dao.delete(id);
  }
}
