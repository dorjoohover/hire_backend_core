import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { MainRequest, Client } from 'src/common/extentions';
import { jwtConstants } from 'src/auth/constants';
import { UserService } from 'src/app/user/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: MainRequest, payload: any) {
    const user = await this.usersService.getUser(payload?.result?.email);

    if (!user) {
      throw new UnauthorizedException();
    }

    const { password, ...result } = user;
    return { ...result, app: 'app' };
  }
}
