import {
  ADMIN,
  CLIENT,
  ORGANIZATION,
  SUPER_ADMIN,
  TESTER,
} from 'src/base/constants';

export enum Role {
  super_admin = SUPER_ADMIN,
  client = CLIENT,
  admin = ADMIN,
  tester = TESTER,
  organization = ORGANIZATION,
}
