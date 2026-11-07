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
import { verifyEmailToken } from 'src/utils/email-token';
export const saltOrRounds = 1;

const OTP_MAX_FAILS = 5;

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

  /**
   * Мэйлээр очсон гарын үсэгтэй token-оор и-мэйлийг баталгаажуулна. Хүчингүй /
   * хугацаа дууссан бол 400 (хэрэглэгч нэвтрэх оролдлого хийвэл `AuthService.login`
   * шинэ баталгаажуулах мэйлийг автоматаар дахин илгээнэ).
   */
  public async confirmEmail(token: string) {
    const email = verifyEmailToken(token);
    if (!email) {
      throw new HttpException(
        'Баталгаажуулах холбоос хүчингүй эсвэл хугацаа дууссан байна.',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.dao.verify(email, true, email);
    return { email };
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

  // OTP таахаас: нэг кодонд OTP_MAX_FAILS буруу оролдлого → код хүчингүй.
  // shortcut: in-memory, replica тус бүр (нийт ≤ 5 × replica оролдлого / код) — Redis-д шилжүүлэх бол олон replica болоход.
  private otpFails = new Map<string, number>();

  /** Код зөв эсэх; буруу бол тоолж, хязгаарт хүрвэл кодыг шатаана. */
  public async verifyOtp(email: string, code: string): Promise<boolean> {
    const key = email?.toLowerCase();
    const user = key ? await this.dao.getByEmail(key, true) : null;
    if (!user?.forget) return false;
    if (`${user.forget}` === `${code}`) {
      this.otpFails.delete(key);
      return true;
    }
    const n = (this.otpFails.get(key) ?? 0) + 1;
    if (n >= OTP_MAX_FAILS) {
      this.otpFails.delete(key);
      await this.dao.updateByEmail({ email: user.email, clearForget: true });
    } else this.otpFails.set(key, n);
    return false;
  }

  public async sendOtp(email: string) {
    this.otpFails.delete(email?.toLowerCase());
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

    if (!(await this.verifyOtp(normalized, code))) {
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

  /** withSecrets: password / forget-ийг нэмнэ (нэвтрэх, OTP шалгах) — хариунд бүү буцаа. */
  async getUser(dto: string, withSecrets = false) {
    return await this.dao.getByEmail(dto?.toLowerCase(), withSecrets);
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
