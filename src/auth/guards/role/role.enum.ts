import {
  ADMIN,
  CLIENT,
  ORGANIZATION,
  SUPER_ADMIN,
  TESTER,
} from 'src/base/constants';

export enum Role {
  // 10
  super_admin = SUPER_ADMIN,
  // 20
  client = CLIENT,
  // 30
  organization = ORGANIZATION,
  // 40
  admin = ADMIN,
  // 50
  tester = TESTER,
}
