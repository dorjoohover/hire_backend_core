import {
  ANONYMOUS,
  CLIENT,
  ORGANIZATION,
  SUPER_ADMIN,
} from 'src/base/constants';

export enum Role {
  admin = SUPER_ADMIN,
  client = CLIENT,
  anonynomous = ANONYMOUS,
  organization = ORGANIZATION,
}
