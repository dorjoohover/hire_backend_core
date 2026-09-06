/**
 * `.env` ачаалагдах ДАРААЛЛЫГ батлах шалгалт.
 *
 * ES import-ууд нь модулийн биеэс ӨМНӨ, эх кодын дарааллаар ажилладаг.
 * Тиймээс `app.module.ts`-ийн дээд талын import-ууд (тэр дундаа
 * `auth/constants.ts`) нь `@Module({ imports: [ConfigModule.forRoot()] })`
 * декоратор биелэхээс ӨМНӨ уншигдана — өөрөөр хэлбэл `.env` дотор бичсэн
 * `JWT_SECRET` тэр үед `process.env`-д ОРООГҮЙ байна.
 */
// main.ts-ийн зан үйлийг дуурайна: эхлээд .env
import '../src/load-env';

console.log(
  '1) load-env-ийн дараа JWT_SECRET:',
  process.env.JWT_SECRET ? 'байна ✅' : 'БАЙХГҮЙ ❌',
);

import { jwtConstants } from '../src/auth/constants';

console.log(
  '2) constants.ts уншигдсаны дараа jwtConstants.secret:',
  jwtConstants.secret === 'secretKey' ? "'secretKey' (fallback!)" : 'env-ийн утга',
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('../src/app.module');

console.log(
  '3) app.module ачаалагдсаны дараа JWT_SECRET:',
  process.env.JWT_SECRET ? 'байна (ConfigModule ачаалсан)' : 'БАЙХГҮЙ',
);
console.log(
  '4) Гэвч jwtConstants.secret хэвээрээ:',
  jwtConstants.secret === 'secretKey' ? "'secretKey' ❌" : 'env-ийн утга ✅',
);
process.exit(0);
