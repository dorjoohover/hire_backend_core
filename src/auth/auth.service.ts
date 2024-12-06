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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.getUser(username);
    if (user == null || !user) return false;
    const isMatch = await bcrypt.compare(pass, user.password);
    if (user && isMatch == true) {
      const { password, ...result } = user;
      return result;
    }
    return false;
  }

  async login(user: LoginUserDto) {
    let result;
    const res = await this.usersService.getUser(user.email);
    if (!user.password) {
      if (!user.name && !user.profile)
        throw new UnauthorizedException('Хэрэглэгч олдсонгүй.');
      if (!res) {
        const newUser = await this.usersService.addUser({
          lastname: '',
          firstname: user.name,
          email: user.email,
          profile: user.profile,
          emailVerified: true,
        });
        if (newUser) {
          result = {
            firstname: user.name,
            email: user.email,
            profile: user.profile,
            emailVerified: true,
          };
        } else {
          throw new HttpException(
            'Нууц үг олдсонгүй.',
            HttpStatus.UNAUTHORIZED,
          );
        }
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
      if (!result) {
        throw new UnauthorizedException('Нууц үг буруу байна.');
      }
    }
    return {
      accessToken: this.jwtService.sign({
        result,
      }),
      user: result,
    };
  }

  async register(user: CreateUserDto) {
    const res = await this.usersService.getUser(user.email);
    if (res) {
      throw new HttpException(
        'Бүртгэлтэй хэрэглэгч байна.',
        HttpStatus.CONFLICT,
      );
    }
    const newUser = await this.usersService.addUser({
      ...user,
    });
    if (newUser) {
      return await this.login({ email: user.email, password: user.password });
    }
  }
}
