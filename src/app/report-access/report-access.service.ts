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
import {
  PaymentStatus,
  ORGANIZATION,
  REPORT_VIEW_GRACE_MINUTES,
} from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';

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
  reason: string | null;
}

/**
 * Тайлангийн monetization (paywall) — эрх шалгах, төлбөр бүртгэх.
 *
 * Хоёр дүрмийг дэмжинэ (тест бүрээр admin-аас тохируулна):
 *   1. `reportFreeViews` — тайланг N удаа үнэгүй харна, дараа нь төлбөртэй.
 *   2. `reportPdfPaid`   — дэлгэц дээр харах үнэгүй, PDF татахад төлбөртэй.
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
    // Ажил олгогч байгууллага худалдаж авсан тест — нэр дэвшигч төлөхгүй.
    if (+exam?.service?.user?.role === ORGANIZATION) {
      return 'organization-paid';
    }

    // Тестийг өөрөө мөнгө төлж авсан бол тайлангийн төлбөрийг ДАХИН авахгүй
    // (давхар төлбөрөөс сэргийлнэ). Тайлангийн paywall нь үндсэндээ ҮНЭГҮЙ
    // тестүүд дээр орлого олох зорилготой. Хэрэв төлбөртэй тест дээр ч
    // тайланг тусад нь зарах бол энэ шалгуурыг арилгана.
    if (
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
    const freeViews = +(assessment?.reportFreeViews ?? 0);
    const pdfPaid = !!assessment?.reportPdfPaid;

    // Үнэ тавиагүй, эсвэл хоёр дүрмийн аль нь ч асаагүй бол paywall байхгүй.
    const enabled = price > 0 && (freeViews > 0 || pdfPaid);
    if (!enabled) return this.freeState(row.code, 'disabled');

    const exempt = this.isExempt(row, user);
    if (exempt) return this.freeState(row.code, exempt);

    const paid = await this.dao.findPaidByCode(row.code);
    const purchased = !!paid;
    const usedViews = +(row.reportViewCount ?? 0);
    const remainingFreeViews = Math.max(0, freeViews - usedViews);

    // ⚠️ Нэг "үнэгүй харалт" = нэг СЕАНС.
    //
    // Өмнө нь grace цонх нь зөвхөн тоолуурыг (ExamDao.incrementReportView)
    // зогсоодог байсан ч эрхийн шалгуурт огт ороогүй. Үүнээс болж эхний
    // харалтад usedViews 1 болмогц `usedViews < freeViews` худал болж,
    // хэрэглэгч ХОРМЫН дараа refresh хийхэд шууд paywall гардаг байв.
    //
    // Тоолох цэг нь тайланг ЭХЭЛЖ нээсэн мөч (`reportViewedAt`) — цонх нь
    // refresh бүрд сунахгүй, тогтмол.
    const viewedAt = row.reportViewedAt ? new Date(row.reportViewedAt) : null;
    const elapsedMs = viewedAt ? Date.now() - viewedAt.getTime() : null;
    const graceMs = REPORT_VIEW_GRACE_MINUTES * 60 * 1000;
    const withinFreeSession =
      elapsedMs != null && elapsedMs >= 0 && elapsedMs < graceMs;
    const freeSessionMinutesLeft = withinFreeSession
      ? Math.max(1, Math.ceil((graceMs - elapsedMs) / 60000))
      : 0;

    const canView =
      purchased || freeViews === 0 || usedViews < freeViews || withinFreeSession;
    const canDownload = purchased ? true : pdfPaid ? false : canView;

    return {
      code: row.code,
      paywall: true,
      price,
      freeViews,
      usedViews,
      remainingFreeViews,
      pdfPaid,
      purchased,
      withinFreeSession,
      freeSessionMinutesLeft,
      canView,
      canDownload,
      reason: purchased
        ? 'purchased'
        : usedViews < freeViews
          ? 'free-view'
          : withinFreeSession
            ? 'free-session'
            : 'payment-required',
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

    const row = await this.dao.create({
      code: exam.code,
      userId: user?.id ? +user.id : (exam.user?.id ?? null),
      assessmentId: exam.assessment?.id ?? null,
      status: PaymentStatus.PENDING,
      price: state.price,
    });

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

  /** QPay-с төлбөрийг шалгаж, төлөгдсөн бол эрхийг нээнэ. */
  public async checkPayment(code: string, invoiceId: string, user?: any) {
    const existing = await this.dao.findPaidByCode(code);
    if (existing) return { paid: true, access: await this.resolve(code, user) };

    const payment: any = await this.qpay.checkPayment(invoiceId);
    const paidAmount = +(payment?.paid_amount ?? 0);

    const pending = await this.dao.findPendingByCode(code);
    if (!pending) {
      throw new HttpException(
        'Нэхэмжлэх олдсонгүй.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // ⚠️ Төлсөн дүн үнээс бага бол эрх нээхгүй (underpayment хамгаалалт).
    if (paidAmount <= 0 || paidAmount < pending.price) {
      return { paid: false, access: await this.resolve(code, user) };
    }

    await this.dao.markPaid(pending.id);
    return { paid: true, access: await this.resolve(code, user) };
  }
}
