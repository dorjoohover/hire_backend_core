import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { parseRolesEnv } from 'src/auth/guards/role/env-roles';

/** `MONITOR_ROLES` env (default 10 = super_admin). Ирээдүйд admin (40) / tester (50)-д код өөрчлөхгүй нээнэ. */
export function parseMonitorRoles(raw: string | undefined = process.env.MONITOR_ROLES) {
  return parseRolesEnv(raw);
}

// Global JwtAuthGuard + RolesGuard-ийн @SUPER()-ээс гадна role-г ТОДОРХОЙ дахин шалгана
// (RolesGuard-ийн дүрэм өөрчлөгдсөн ч Monitor нээгдэхгүй).
@Injectable()
export class MonitorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest()?.user;
    if (!user || !parseMonitorRoles().includes(Number(user.role))) {
      throw new ForbiddenException('Monitor эрх байхгүй');
    }
    return true;
  }
}
