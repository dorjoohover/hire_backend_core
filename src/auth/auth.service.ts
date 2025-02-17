import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/app/user/user.service';
import { LoginUserDto } from './auth.dto';
import { CreateUserDto } from 'src/app/user/dto/create-user.dto';
import { CLIENT, ORGANIZATION } from 'src/base/constants';
import { jwtConstants } from './constants';
import { Role } from './guards/role/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.getUser(username);
    if (user == null || !user) return -1;
    const isMatch = await bcrypt.compare(pass, user.password);
    if (user && isMatch == true) {
      const { password, ...result } = user;
      return result;
    }
    return 0;
  }

  async forceLogin(
    email: string,
    phone: string,
    lastname: string,
    firstname: string,
  ) {
    let user = await this.usersService.getUser(email);
    console.log(user);
    if (!user) {
      user = await this.usersService.addUser({
        email: email,
        emailVerified: true,
        firstname: firstname,
        lastname: lastname,
        phone: phone,
        role: Role.client,
      });
    }
    return await this.generateToken(user);
  }

  async login(user: LoginUserDto) {
    let result;
    let res = await this.usersService.getUser(user.email);
    if (!res) res = await this.usersService.getUser(user.registerNumber);
    if (res && !res.emailVerified)
      throw new HttpException(
        'И-мейл хаягаа баталгаажуулна уу.',
        HttpStatus.FORBIDDEN,
      );
    if (!user.password) {
      if (!user.name && !user.profile)
        throw new UnauthorizedException('Хэрэглэгч олдсонгүй.');
      if (!res) {
        await this.usersService.addUser({
          lastname: '',
          firstname: user.name,
          email: user.email,
          profile: user.profile,
          emailVerified: true,
        });
      } else {
        result = {
          firstname: res?.firstname,
          lastname: res?.lastname,
          role: res.role,
          email: res.email,
          organizationName: res?.organizationName,
          organizationRegisterNumber: res?.organizationRegisterNumber,
          organizationPhone: res?.organizationPhone,
          position: res?.position,
          phone: res?.phone,
          profile: res?.profile,
          emailVerified: res.emailVerified,
        };
      }
    } else {
      result = await this.validateUser(user.email, user.password);

      if (result == -1) {
        result = await this.validateUser(user.registerNumber, user.password);
      }
      if (result == 0)
        throw new HttpException('Нууц үг буруу байна.', HttpStatus.BAD_REQUEST);
      if (result == -1)
        throw new HttpException(
          'Бүртгэлгүй хэрэглэгч байна.',
          HttpStatus.UNAUTHORIZED,
        );
    }
    const token = await this.generateToken(result);
    return {
      accessToken: token,
      user: result,
    };
  }

  async generateToken(result) {
    return this.jwtService.sign({
      result,
    });
  }

  async register(user: CreateUserDto) {
    const res = await this.usersService.getUser(user.email);
    if (res) {
      throw new HttpException(
        'Бүртгэлтэй хэрэглэгч байна.',
        HttpStatus.CONFLICT,
      );
    }
    await this.usersService.addUser({
      ...user,
    });
  }
}
