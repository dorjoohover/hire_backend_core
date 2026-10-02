/**
 * ⚠️ АЮУЛГҮЙ БАЙДАЛ: өмнө нь энэ нь `'secretKey'` гэсэн хатуу бичсэн утга
 * байсан. Repo-г үзсэн хэн ч бай дурын хэрэглэгчийн (тэр дундаа super_admin)
 * JWT-г хуурамчаар үүсгэж, бүрэн эрхээр систем рүү орох боломжтой байв.
 *
 * Одоо `JWT_SECRET` env-ээс уншина. Production дээр ЗААВАЛ санамсаргүй урт
 * утга тавина уу (жишээ нь `openssl rand -hex 48`). Анхааруулга: секретийг
 * солиход өмнө олгогдсон БҮХ token хүчингүй болж, хэрэглэгчид дахин нэвтэрнэ.
 */
const secret = process.env.JWT_SECRET;

if (!secret && process.env.NODE_ENV === 'production') {
  // Production дээр default секрет ашиглахыг зөвшөөрөхгүй.
  throw new Error(
    'JWT_SECRET тохируулаагүй байна. Production дээр заавал тохируулна уу.',
  );
}

if (!secret) {
  console.warn(
    '⚠️  JWT_SECRET тохируулаагүй байна — түр зуурын dev секрет ашиглаж байна.',
  );
}

export const jwtConstants = {
  secret: secret ?? 'secretKey',
};
