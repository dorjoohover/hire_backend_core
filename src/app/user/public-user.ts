import { UserEntity } from './entities/user.entity';

/** Нэвтрэлтгүй (нийтийн) хариунд хэрэглэгчийг зөвхөн нэрээр — email / phone / wallet / регистр гадагш гаргахгүй. */
export const publicUser = (u?: UserEntity | null) =>
  u ? { id: u.id, firstname: u.firstname, lastname: u.lastname } : null;
