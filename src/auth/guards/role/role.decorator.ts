import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Role } from './role.enum';
import { ADMIN, ORGANIZATION, SUPER_ADMIN, TESTER } from 'src/base/constants';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export function ADMINS() {
  return applyDecorators(Roles(ADMIN, SUPER_ADMIN, TESTER));
}
export function SUPER() {
  return applyDecorators(Roles(SUPER_ADMIN));
}

export function ORG() {
  return applyDecorators(Roles(ORGANIZATION, SUPER_ADMIN, ADMIN, TESTER));
}
