import {
  Injectable,
  ExecutionContext,
  SetMetadata,
  CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      // ALWAYS try jwt, but never block
      try {
        await super.canActivate(context);
      } catch {
        // ignore
      }
      return true; // always allow
    }

    // private route
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err, user, _info, context) {
    const req = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      req.user = user ?? null;
      return req.user;
    }

    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    req.user = user;
    return user;
  }
}
