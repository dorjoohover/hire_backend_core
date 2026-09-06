import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * ⚠️ ЭНЭ ФАЙЛЫГ `main.ts`-ийн ХАМГИЙН ЭХНИЙ import байлгана.
 *
 * Асуудал: ES import-ууд нь модулийн биеэс өмнө, эх кодын дарааллаар
 * ажилладаг. Тиймээс `app.module.ts`-ийн дээд талын import-ууд (тэр дундаа
 * `auth/constants.ts`) нь `@Module({ imports: [ConfigModule.forRoot(...)] })`
 * декоратор биелэхээс ӨМНӨ уншигдана.
 *
 * Үр дагавар: модулийн түвшинд `process.env`-ээс уншдаг ТОГТМОЛУУД —
 * `jwtConstants.secret` (JWT_SECRET), `REPORT_VIEW_GRACE_MINUTES` гэх мэт —
 * `.env` дэх утгыг ХЭЗЭЭ Ч хардаггүй, чимээгүйхэн fallback дээрээ үлддэг
 * байсан. JWT-ийн хувьд энэ нь эх кодод хатуу бичсэн `'secretKey'`-г
 * үргэлжлүүлэн ашиглана гэсэн үг — өөрөөр хэлбэл аюулгүй байдлын засвар
 * бодитоор ажиллахгүй байв.
 *
 * Шийдэл: Nest-ийн ConfigModule ажиллахаас өмнө dotenv-ийг гараар дуудна.
 * dotenv нь аль хэдийн тавигдсан хувьсагчийг ДАРЖ БИЧДЭГГҮЙ тул бодит
 * орчны хувьсагч (Docker/CI) үргэлж давуу эрхтэй хэвээр үлдэнэ.
 *
 * Файлын дараалал нь ConfigModule-ийн одоогийн зан үйлтэй тохирсон:
 * `.env.development` эхэлж (app.module), дараа нь `.env` (database.module).
 */
for (const file of ['.env.development', '.env']) {
  const path = join(process.cwd(), file);
  if (existsSync(path)) {
    config({ path });
  }
}
