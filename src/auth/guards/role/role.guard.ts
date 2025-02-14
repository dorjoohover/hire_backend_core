import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './role.decorator';
import { Role } from './role.enum';
import { IS_PUBLIC_KEY } from '../jwt/jwt-auth-guard';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RolesGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean {
    try {
      const isPublic = this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (isPublic) {
        return true;
      }

      const { user } = context.switchToHttp().getRequest();

      const userRole = user.role;
      if (
        user.app === 'app' &&
        (userRole === Role.admin ||
          userRole === Role.client ||
          userRole === Role.super_admin ||
          userRole == Role.organization ||
          Role.tester)
      ) {
        return true;
      }
      if (
        user.app === 'admin' &&
        (userRole === Role.super_admin ||
          userRole === Role.admin ||
          userRole === Role.tester)
      ) {
        return true;
      }

      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );

      if (!requiredRoles || requiredRoles.length === 0) {
        return false;
      }

      if (!user || !user || !user.role) {
        return false;
      }

      return requiredRoles.some((role) => role === userRole);
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
