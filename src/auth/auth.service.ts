import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from 'src/app/user/user.service';
import { LoginUserDto } from './auth.dto';

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
    const result = await this.validateUser(user.email, user.password);
    if (!result) {
      throw new UnauthorizedException();
    }
    return {
      accessToken: this.jwtService.sign({
        result,
      }),
      user: {
        name: result.name,
        role: result.role,
        email: result.email,
      },
    };
  }
}
