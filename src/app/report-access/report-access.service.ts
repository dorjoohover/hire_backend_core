import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ReportAccessDao } from './report-access.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { QpayService } from '../payment/qpay.service';
import { ReportAccessEntity } from './entities/report-access.entity';
import { PaymentStatus, ORGANIZATION } from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';

/**
 * Нэхэмжлэх (invoice) spam хязгаар — `POST :code/invoice` нэвтрэлтгүй тул
 * дурын хүн нэг кодоор мянган QPay нэхэмжлэх + DB мөр үүсгэж болохоос сэргийлнэ.
 *  - нэг code: INVOICE_WINDOW_MIN минутад INVOICE_MAX_PER_CODE-с илүүгүй (DB-ээр);
 *  - нийт: INVOICE_GLOBAL_PER_MIN / минут (процессын санах ойд).
 * API `trust proxy`-гүй тул IP-аар хязгаарлахгүй (бүх хүсэлт proxy-ийн IP-тэй харагдана).
 */
export const INVOICE_WINDOW_MIN = 10;
export const INVOICE_MAX_PER_CODE = 3;
export const INVOICE_GLOBAL_PER_MIN = 60;

export interface ReportAccessState {
  code: string;
  /** Энэ тайланд paywall үйлчилж байгаа эсэх. */
  paywall: boolean;
  /** Нэг удаа нээхийн үнэ (₮). */
  price: number;
  /** Үнэгүй харах эрхийн тоо (0 = хязгааргүй). */
  freeViews: number;
  /** Аль хэдийн хэдэн удаа үзсэн. */
  usedViews: number;
  /** Үлдсэн үнэгүй харалт. */
  remainingFreeViews: number;
  /** PDF-д тусад нь төлбөр шаардах эсэх. */
  pdfPaid: boolean;
  /** Төлбөр төлж нээсэн эсэх. */
  purchased: boolean;
  /** Одоогийн үнэгүй харалтын сеанс идэвхтэй эсэх (refresh хийхэд хэвийн). */
  withinFreeSession: boolean;
  /** Идэвхтэй сеанс хэдэн минутын дараа дуусах (0 = сеансгүй). */
  freeSessionMinutesLeft: number;
  canView: boolean;
  canDownload: boolean;
  /** №4: assessment-ийн жишээ тайлангийн файл — төлбөрийн CTA-ны хажууд "Жишээ тайлан үзэх" товчинд. */
  exampleReport?: string | null;
  reason: string | null;
}

/**
 * Тайлангийн monetization (paywall) — эрх шалгах, төлбөр бүртгэх.
 *
 * №4 + №6 загвар: ҮР ДҮН (оноо / түвшин / товч тайлбар, `GET exam/exam/:code`) ХЭЗЭЭ Ч үнэгүй, хязгааргүй
 * (`canView` үргэлж true). Төлбөртэй нь ДЭЛГЭРЭНГҮЙ тайлан (PDF, `canDownload`). Оролцогч төлнө;
 * байгууллага (staff role) ба admin / tester үнэгүй. Хоёр дүрмийг дэмжинэ (тест бүрээр admin-аас тохируулна):
 *   1. `reportPdfPaid`   — PDF татахад төлбөртэй (ЗӨВЛӨМЖТЭЙ, UI зөвхөн үүнийг үзүүлнэ).
 *   2. `reportFreeViews` — (хуучин) PDF-ийг N удаа / 30 мин-ийн сеансаар үнэгүй татна, дараа нь төлбөртэй.
 *      Үр дүн ЭНЭ горимд ч түгжигдэхгүй; харалтыг зөвхөн PDF endpoint тоолно.
 *
 * Хоёулаа нэг л худалдан авалтаар нээгддэг: `report_access` дээр тухайн
 * exam code-оор SUCCESS мөр үүсмэгц хязгааргүй харах + PDF татах эрхтэй.
 */
@Injectable()
export class ReportAccessService {
  constructor(
    private dao: ReportAccessDao,
    @Inject(forwardRef(() => ExamDao)) private examDao: ExamDao,
    private qpay: QpayService,
  ) {}

  /** Процесс дотор сүүлийн 1 минутад үүссэн нэхэмжлэхийн цагууд. */
  private invoiceHits: number[] = [];

  private assertInvoiceRate(): void {
    const now = Date.now();
    this.invoiceHits = this.invoiceHits.filter((t) => now - t < 60_000);
    if (this.invoiceHits.length >= INVOICE_GLOBAL_PER_MIN) {
      throw new HttpException(
        'Хүсэлт хэт олон байна. Түр хүлээгээд дахин оролдоно уу.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.invoiceHits.push(now);
  }

  private freeState(code: string, reason: string): ReportAccessState {
    return {
      code,
      paywall: false,
      price: 0,
      freeViews: 0,
      usedViews: 0,
      remainingFreeViews: 0,
      pdfPaid: false,
      purchased: false,
      withinFreeSession: false,
      freeSessionMinutesLeft: 0,
      canView: true,
      canDownload: true,
      reason,
    };
  }

  /** Тухайн хэрэглэгч тайлангийн төлбөрөөс чөлөөлөгдөх эсэх. */
  private isExempt(exam: any, user?: any): string | null {
    const role = user ? +user.role : null;
    if (
      role != null &&
      [Role.admin, Role.tester, Role.super_admin, Role.organization].includes(
        role,
      )
    ) {
      return 'staff';
    }
    // №4: байгууллагын худалдаж авсан тест дээр оролцогч дэлгэрэнгүй тайланг ӨӨРӨӨ төлнө — өмнөх
    // 'organization-paid' чөлөөлөлт ХАСАГДСАН. Байгууллага өөрөө (дээрх `staff`) үнэгүй.
    const ownerIsOrganization = +exam?.service?.user?.role === ORGANIZATION;

    // Тестийг ӨӨРӨӨ (оролцогч = худалдан авагч) мөнгө төлж авсан бол тайлангийн төлбөрийг ДАХИН авахгүй
    // (давхар төлбөрөөс сэргийлнэ). Байгууллагын wallet-аар төлсөн service энд ОРОХГҮЙ — тэр нь
    // оролцогчийн төлбөр биш (`ownerIsOrganization`).
    if (
      !ownerIsOrganization &&
      +(exam?.service?.price ?? 0) > 0 &&
      +(exam?.service?.status ?? 0) === PaymentStatus.SUCCESS
    ) {
      return 'test-purchased';
    }

    return null;
  }

  public async resolve(
    code: string,
    user?: any,
    exam?: any,
  ): Promise<ReportAccessState> {
    const row = exam ?? (await this.examDao.findByCode(code));
    if (!row) {
      throw new HttpException('Тест олдсонгүй.', HttpStatus.NOT_FOUND);
    }

    const assessment = row.assessment;
    const price = +(assessment?.reportPrice ?? 0);
    const pdfPaid = !!assessment?.reportPdfPaid;

    // 2026-09-22: хялбарчлав (хэрэглэгчийн хүсэлтээр) — "Үнэгүй харах
    // эрхийн тоо" (`reportFreeViews`) болон түүний сеансын grace-цонхны
    // механизмыг ЭНД цаашид ашиглахгүй болгов. Одоо цэвэр хоёртын дүрэм:
    // `reportPrice = 0` → тайлан (PDF) бүрэн үнэгүй; `reportPrice > 0` →
    // худалдан авалгүйгээр PDF татах боломжгүй (үнэгүй харалт/сессийн
    // хугацаа байхгүй болсон). `assessment.reportFreeViews` баганыг DB-ээс
    // хасаагүй, зөвхөн энд уншихаа больсон — сэргээхэд амархан (reversible).
    const enabled = price > 0;
    if (!enabled) return this.freeState(row.code, 'disabled');

    const exempt = this.isExempt(row, user);
    if (exempt) return this.freeState(row.code, exempt);

    const paid = await this.dao.findPaidByCode(row.code);
    const purchased = !!paid;
    // №6: үр дүн ХЭЗЭЭ Ч үнэгүй — `canView` үргэлж true.
    const canView = true;
    const canDownload = purchased;

    return {
      code: row.code,
      paywall: true,
      price,
      freeViews: 0,
      usedViews: 0,
      remainingFreeViews: 0,
      pdfPaid,
      purchased,
      withinFreeSession: false,
      freeSessionMinutesLeft: 0,
      canView,
      canDownload,
      exampleReport: assessment?.exampleReport || null,
      reason: purchased ? 'purchased' : 'payment-required',
    };
  }

  /**
   * Үнэгүй харалтыг нэгээр нэмэгдүүлнэ. Зөвхөн paywall идэвхтэй, төлөөгүй,
   * бөгөөд үнэгүй эрх нь дуусаагүй үед тоолно.
   */
  public async registerView(code: string, state: ReportAccessState) {
    if (!state.paywall || state.purchased) return;
    if (state.freeViews <= 0) return;
    if (state.usedViews >= state.freeViews) return;
    await this.examDao.incrementReportView(code);
  }

  /** Тайлан нээх QPay нэхэмжлэх үүсгэнэ. */
  public async createInvoice(code: string, user?: any) {
    const exam = await this.examDao.findByCode(code);
    const state = await this.resolve(code, user, exam);

    if (!state.paywall) {
      throw new HttpException(
        'Энэ тайланд төлбөр шаардлагагүй.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (state.purchased) {
      return { alreadyPaid: true, invoice: null, access: state };
    }

    // Spam хязгаар: эхлээд процессын нийт, дараа нь энэ code-ын сүүлийн цагийн тоо.
    this.assertInvoiceRate();
    const recent = await this.dao.countRecentByCode(
      exam.code,
      INVOICE_WINDOW_MIN,
    );
    if (recent >= INVOICE_MAX_PER_CODE) {
      throw new HttpException(
        `Нэхэмжлэх олон удаа үүсгэсэн байна. ${INVOICE_WINDOW_MIN} минутын дараа дахин оролдоно уу.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const row = await this.dao.create({
      code: exam.code,
      userId: user?.id ? +user.id : (exam.user?.id ?? null),
      assessmentId: exam.assessment?.id ?? null,
      status: PaymentStatus.PENDING,
      price: state.price,
    });

    // QPAY_REPORT_CALLBACK = https://<api>/api/v1/report-access/callback
    // → QPay төлбөр төлөгдмөгц `GET .../callback/<row.id>` дууддаг (handleCallback).
    // Тохируулаагүй бол зөвхөн polling (checkPayment)-оор эрх нээгдэнэ.
    const callback = process.env.QPAY_REPORT_CALLBACK
      ? `${process.env.QPAY_REPORT_CALLBACK}/${row.id}`
      : undefined;

    const invoice = await this.qpay.createInvoice(
      state.price,
      row.id,
      user?.id ? +user.id : (exam.user?.id ?? 0),
      callback,
    );

    if (invoice?.invoice_id) {
      await this.dao.setInvoice(row.id, invoice.invoice_id);
    }

    return { alreadyPaid: false, invoice, access: state, accessId: row.id };
  }

  /**
   * `report_access` мөрийн нэхэмжлэхийг QPay-с шалгаж, төлөгдсөн бол SUCCESS
   * болгоно. Polling (`checkPayment`) ба QPay callback (`handleCallback`)
   * хоёул ЭНЭ нэг логикийг ашиглана. Идемпотент.
   *
   * ⚠️ Төлбөрийг ЗӨВХӨН мөрийн өөрийн `invoiceId`-аар асууна — URL / query-ээр
   * ирсэн өөр ямар ч id-д итгэхгүй.
   */
  private async confirmPending(row: ReportAccessEntity): Promise<boolean> {
    if (row.status === PaymentStatus.SUCCESS) return true;
    if (row.status !== PaymentStatus.PENDING || !row.invoiceId) return false;

    const payment: any = await this.qpay.checkPayment(row.invoiceId);
    const paidAmount = +(payment?.paid_amount ?? 0);

    // ⚠️ Төлсөн дүн үнээс бага бол эрх нээхгүй (underpayment хамгаалалт).
    if (paidAmount <= 0 || paidAmount < row.price) return false;

    await this.dao.markPaid(row.id);
    return true;
  }

  /** QPay-с төлбөрийг шалгаж, төлөгдсөн бол эрхийг нээнэ (polling). */
  public async checkPayment(code: string, invoiceId: string, user?: any) {
    const existing = await this.dao.findPaidByCode(code);
    if (existing) return { paid: true, access: await this.resolve(code, user) };

    // ⚠️ URL-ийн `invoiceId` нь ЭНЭ `code`-ынх байх ёстой. Өмнө нь QPay-с
    // URL-ийн invoiceId-аар асууж, дараа нь кодын сүүлийн PENDING мөрийг
    // нээдэг байсан тул өөр тайлан / бүтээгдэхүүний төлөгдсөн нэхэмжлэхээр
    // дурын код дээр эрх нээж болдог байв.
    const row = await this.dao.findByInvoice(invoiceId);
    if (!row || row.code !== `${code}`) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.BAD_REQUEST);
    }

    const paid = await this.confirmPending(row);
    return { paid, access: await this.resolve(code, user) };
  }

  /**
   * QPay callback. Төлбөр төлөгдмөгц QPay
   *   GET <QPAY_REPORT_CALLBACK>/<accessId>?qpay_payment_id=...
   * хаяг руу дууддаг (`createInvoice` дотор `callback_url` болгож дамжуулсан),
   * тиймээс хэрэглэгч хуудсаа хаасан / polling дууссан ч эрх автоматаар нээгдэнэ.
   *
   * ⚠️ Нэвтрэлтгүй (public) тул URL / query-д итгэхгүй: `accessId` нь зөвхөн
   * `report_access` мөрийг олно, төлбөрийг QPay-с тэр мөрийн ӨӨРИЙН
   * `invoiceId`-аар дахин асууж баталгаажуулна. `qpay_payment_id`-г ашиглахгүй
   * (зөвхөн лог) — өөр нэхэмжлэхийн payment id-аар эрх нээх боломжгүй.
   */
  public async handleCallback(accessId: number, qpayPaymentId?: string) {
    // report_access.id нь int4 — хэт том утга DB-д алдаа (500) өгөхөөс өмнө таслана.
    if (!Number.isInteger(accessId) || accessId < 1 || accessId > 2147483647) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    const row = await this.dao.findById(accessId);
    if (!row) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.NOT_FOUND);
    }

    const paid = await this.confirmPending(row);
    const paymentId = `${qpayPaymentId ?? ''}`
      .replace(/[^\w-]/g, '')
      .slice(0, 64);
    console.log(
      `[report-access] QPay callback #${row.id} paid=${paid} payment=${paymentId}`,
    );
    return { paid };
  }
}
