import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';

// Үйлчилгээ хоорондын (жишээ нь hire_report → core) дотоод endpoint-уудыг
// хамгаална: `POST /report`, `GET /report/mail/:code`.
// Хэрэглэгчийн JWT биш — тогтмол түлхүүр (core/.env ба hire_report/.env-ийн
// ХОЁУЛАНД тохирсон `INTERNAL_API_KEY`). Route дээр @Public() (global
// JwtAuthGuard-ыг алгасах) + @UseGuards(InternalKeyGuard) хамт ашиглана.
//
// Хүлээж авах header: `x-internal-key: <INTERNAL_API_KEY>`
//
// Түлхүүр тохируулаагүй бол "хамгаалалтгүй нээлттэй" гэсэн буруу төлөвт
// унахгүйн тулд бүрмөсөн хаана (fail closed) — AiAgentGuard-тай ижил.
@Injectable()
export class InternalKeyGuard implements CanActivate {
  /** Түлхүүр тохируулаагүй үед нэвтрүүлэх эсэх (зөвхөн InternalKeyGuardLenient). */
  protected readonly allowWhenUnset: boolean = false;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected) {
      if (this.allowWhenUnset) return true;
      throw new UnauthorizedException('Internal API access is not configured.');
    }

    const provided = req.headers?.['x-internal-key'];
    if (typeof provided !== 'string' || !provided) {
      throw new UnauthorizedException('Invalid internal key.');
    }

    // Урт өөр байсан ч timingSafeEqual алдаа өгөхгүйн тулд hash-лаад харьцуулна.
    const a = createHash('sha256').update(provided).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid internal key.');
    }
    return true;
  }
}

/**
 * `GET /report/mail/:code`-д зориулсан "шилжилтийн" хувилбар: `INTERNAL_API_KEY`
 * тохируулаагүй бол нэвтрүүлнэ; тохируулсан бол InternalKeyGuard-тай яг адил
 * шаардана.
 *
 * Яагаад: `sendMail` нь одоо идемпотент бөгөөд зөвхөн COMPLETED тайланд мэйл
 * илгээдэг (web-ийн `status` polling ч яг үүнийг хийдэг) тул нээлттэй үлдсэн ч
 * нэмэлт эрсдэл бага. Харин deploy-ийн дарааллыг чөлөөтэй болгодог: core (DDL)
 * ЭХЭЛЖ гарах ёстой, түлхүүртэй hire_report дараа нь гарна — тэр хооронд хуучин
 * hire_report-ийн mail дуудлага 401-ээр унаж job дахин бодогдохгүй. Түлхүүрийг
 * hire_report deploy-ийн ДАРАА core `.env`-д тавьснаар хатуу горимд шилжинэ.
 * `POST /report`-д ЭНЭ биш, хатуу InternalKeyGuard ашиглана.
 */
@Injectable()
export class InternalKeyGuardLenient extends InternalKeyGuard {
  protected readonly allowWhenUnset: boolean = true;
}
