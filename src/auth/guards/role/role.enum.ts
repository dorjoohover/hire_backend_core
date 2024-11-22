import { ANONYMOUS, CLIENT, SUPER_ADMIN, VISITOR } from 'src/base/constants';

export enum Role {
  admin = SUPER_ADMIN,
  client = CLIENT,
  anonynomous = ANONYMOUS,
  visitor = VISITOR,
}
