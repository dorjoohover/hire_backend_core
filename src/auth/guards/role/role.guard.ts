import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './role.decorator';
import { Role } from './role.enum';
import { IS_PUBLIC_KEY } from '../jwt/jwt-auth-guard';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // ✅ Public route → бүрэн skip
    const request = context.switchToHttp().getRequest();
    if (isPublic) {
      return true;
    }

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const userRole = user.role;

    // ✅ App-based rules
    // if (
    //   user.app === 'app' &&
    //   [
    //     Role.admin,
    //     Role.client,
    //     Role.super_admin,
    //     Role.organization,
    //     Role.tester,
    //   ].includes(userRole)
    // ) {
    //   return true;
    // }
    if (
      user.app === 'admin' &&
      [Role.super_admin, Role.admin, Role.tester].includes(userRole)
    ) {
      return true;
    }

    // ✅ @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.includes(userRole);
  }
}
