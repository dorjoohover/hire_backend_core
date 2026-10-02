import { ADMIN, SUPER_ADMIN, TESTER } from 'src/base/constants';

/**
 * env (таслалаар тусгаарласан role дугаарууд, жишээ `10,40`) → зөвшөөрөх role-ууд.
 * Зөвхөн админы ангиллын role (10 super_admin / 40 admin / 50 tester) хүлээн авна —
 * client (20) / organization (30) буруугаар тавигдсан ч хэзээ ч нэвтрэхгүй.
 * Хоосон / хүчингүй бол зөвхөн SUPER_ADMIN (10).
 */
export function parseRolesEnv(raw: string | undefined): number[] {
  const allowed = [SUPER_ADMIN, ADMIN, TESTER];
  const parsed = String(raw ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => allowed.includes(n));
  return parsed.length ? parsed : [SUPER_ADMIN];
}
