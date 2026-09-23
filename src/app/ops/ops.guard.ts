import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { parseRolesEnv } from 'src/auth/guards/role/env-roles';

/**
 * `OPS_ROLES` env (таслалаар тусгаарласан role дугаарууд) — ops endpoint-д
 * хандах эрх. Тохируулаагүй бол зөвхөн SUPER_ADMIN (10). Зөвхөн админы
 * ангиллын role (10 / 40 / 50) хүлээн авна; client (20) / organization (30)
 * буруугаар тавигдсан ч хэзээ ч нэвтрэхгүй.
 */
export function parseOpsRoles(raw: string | undefined = process.env.OPS_ROLES) {
  return parseRolesEnv(raw);
}

// Global JwtAuthGuard (нэвтэрсэн эсэх) + RolesGuard-ийн @SUPER()-ээс гадна, ops
// endpoint бүрд ЯГ ЭНЭ guard-ыг тавьж role-г дахин, тодорхой шалгана — ингэснээр
// RolesGuard-ийн дүрэм (app='admin' богино зам гэх мэт) өөрчлөгдсөн ч ops нээгдэхгүй.
@Injectable()
export class OpsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest()?.user;
    if (!user || !parseOpsRoles().includes(Number(user.role))) {
      throw new ForbiddenException('Ops эрх байхгүй');
    }
    return true;
  }
}
