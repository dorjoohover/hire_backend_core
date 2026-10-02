import { basename, join, resolve, sep } from 'path';
import { BadRequestException } from '@nestjs/common';

/**
 * `root` (жишээ нь './uploads') доторх НЭГ файлын замыг буцаана; бусад тохиолдолд
 * 400 шиднэ.
 *
 * ⚠️ Өмнө нь `join('./uploads', filename)`-д ирсэн нэрийг цэвэрлэхгүй ашигладаг
 * байсан. Express нь route param дахь `%2F`-ийг `/` болгож decode хийдэг тул
 * `..%2F..%2Fpackage.json` нь `uploads/`-с гадуурх файлыг (.env, нууцууд гэх мэт)
 * уншуулах боломжтой байв.
 *
 * Зөвшөөрөх: зөвхөн нэг сегментийн нэр (`/`, `\`, NUL, `.`, `..` байхгүй), 255
 * тэмдэгтээс ихгүй. Юникод / зай зөвшөөрнө (upload нь `${Date.now()}_${originalname}`
 * нэр ашигладаг тул Монгол нэртэй файл байдаг). Нэмэлтээр эцсийн зам `root`-ын
 * дотор эсэхийг `resolve`-оор давхар шалгана. Хүчинтэй нэрэнд үр дүн нь өмнөх
 * `join(root, filename)`-тэй ижил.
 */
export function resolveInside(root: string, filename: string): string {
  if (
    typeof filename !== 'string' ||
    filename.length === 0 ||
    filename.length > 255 ||
    /[\0/\\]/.test(filename) ||
    filename === '.' ||
    filename === '..' ||
    basename(filename) !== filename
  ) {
    throw new BadRequestException('Invalid file name');
  }
  const base = resolve(root);
  const full = resolve(base, filename);
  if (!full.startsWith(base + sep)) {
    throw new BadRequestException('Invalid file name');
  }
  return join(root, filename);
}
