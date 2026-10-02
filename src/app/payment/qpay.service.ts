// src/qpay/qpay.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { isSafeMode, safeLog } from '../../utils/safe-mode';

// SAFE_MODE-ийн mock invoice: id-д дүнг шингээсэн тул process дахин асахад ч
// `checkPayment` дүнг сэргээж чадна (in-memory state хэрэггүй).
// Формат: SAFE-<дүн>-<invoiceId>-<цаг>
const SAFE_INVOICE_RE = /^SAFE-(\d+(?:\.\d+)?)-/;
// 1x1 PNG — web-ийн `data:image/png;base64,${qr_image}` харагдацыг эвдэхгүй.
const SAFE_QR_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
@Injectable()
export class QpayService {
  private readonly logger = new Logger(QpayService.name);

  private baseUrl = 'https://merchant.qpay.mn/v2/';
  private accessToken: string;
  private expiresIn: Date;
  // Access token-той хамт ирдэг `refresh_token`/`auth/refresh`-ийг ЭНЭ талаас
  // 2026-09-24-нөөс хойш ашиглахгүй болгов (хэрэглэгчийн хүсэлтээр) — зөвхөн
  // Basic auth-аар (`authenticate()`) 24 цаг тутам шинэ access token авна.
  // QPay docs-ын "токен хугацаа дуусахаас өмнө ойр ойрхон олон дахин токен
  // бүү ав" гэсэн анхааруулгыг зөрчихгүй (24 цаг = ховор, найдвартай давтамж),
  // мөн refresh_token хугацаа дуусах/хүчингүй болох тохиолдолд гацдаг байсан
  // fallback-гүй асуудлыг бүрмөсөн арилгана.
  constructor(private readonly httpService: HttpService) {}

  private async ensureValidToken() {
    const now = new Date();

    if (!this.accessToken || now >= this.expiresIn) {
      console.log('Access token байхгүй/24 цаг өнгөрсөн → Дахин нэвтэрч байна...');
      await this.authenticate();
    }
  }

  private async requestWithToken<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: any = {},
  ): Promise<T> {
    await this.ensureValidToken(); // check expiry first

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: `${this.baseUrl}${endpoint}`,
          data,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }),
      );
      return response.data;
    } catch (error) {
      // ⚠️ `error.response.data.message` гэж шууд уншдаг байсан тул сүлжээний
      // алдаа (response байхгүй) үед жинхэнэ алдааг далдалж TypeError өгдөг байв.
      console.error(
        '❌ QPay хүсэлтийн алдаа:',
        error?.response?.data?.message ?? error?.message,
      );
      if (error.response?.status === 401) {
        console.log('QPay 401 → Дахин нэвтэрч (authenticate) байна...');
        await this.authenticate();
        const retryResponse = await firstValueFrom(
          this.httpService.request({
            method,
            url: `${this.baseUrl}${endpoint}`,
            data,
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }),
        );
        return retryResponse.data;
      }

      throw error;
    }
  }
  private async authenticate() {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}auth/token`,
          {},
          {
            auth: {
              username: process.env.QPAY_CLIENT_ID,
              password: process.env.QPAY_CLIENT_SECRET,
            },
            timeout: 10000,
          },
        ),
      );

      this.accessToken = response.data.access_token;
      // Refresh token-ыг бүү ашигла — 24 цагийн дараа дахин Basic auth-аар
      // (энэ функцээр) шинэ access token авна (QPay-ийн `expires_in`-ээс үл
      // хамааран; ихэвчлэн энэ утга дан access token-д хэрэглэхэд хэт богино,
      // refresh-тэй хослуулахад зориулагдсан байдаг).
      this.expiresIn = new Date(Date.now() + 24 * 60 * 60 * 1000);
    } catch (e) {
      console.error('QPAY AUTH ERROR:', e.response?.data || e.message);
      throw e;
    }
  }

  // ✅ Invoice үүсгэх
  /**
   * @param callbackUrl QPay-ийн callback хаяг. Өгөөгүй бол тестийн худалдан
   *   авалтын анхдагч (`userService/callback/...`) хаяг руу заана. Тайлан нээх
   *   (report-access) зэрэг өөр төрлийн төлбөрт өөрийн хаягаа дамжуулна.
   */
  async createInvoice(
    amount: number,
    invoiceId: number,
    userId: number,
    callbackUrl?: string,
  ) {
    if (isSafeMode()) {
      const id = `SAFE-${amount}-${invoiceId}-${Date.now()}`;
      safeLog(
        'QPay invoice үүсгээгүй (mock)',
        `invoice_id=${id} amount=${amount} user=${userId}`,
      );
      return {
        invoice_id: id,
        qr_text: 'SAFE_MODE',
        qr_image: SAFE_QR_PNG,
        qPay_shortUrl: '',
        urls: [],
        safeMode: true,
      };
    }
    try {
      // ⚠️ Өмнө нь `await` дутуу байсан тул доорх try/catch хэзээ ч
      // ажилладаггүй байв.
      const res = await this.requestWithToken('POST', 'invoice', {
        invoice_code: 'AXIOM_INC_INVOICE',
        sender_invoice_no: `${invoiceId}`,
        sender_branch_code: 'hire',
        invoice_receiver_code: `${userId}`,
        amount,
        invoice_description: 'Тест худалдан авлаа.',
        invoice_due_date: null,
        allow_partial: false,
        minimum_amount: null,
        allow_exceed: false,
        maximum_amount: null,
        note: null,
        callback_url:
          callbackUrl ??
          `${process.env.QPAY_CALLBACK}/${invoiceId}/${userId}`,
      });

      return res;
    } catch (error) {
      console.error('❌ QPay createInvoice алдаа:', error?.message);
      throw error;
    }
  }

  // ✅ Invoice харах
  async getInvoice(id: string) {
    if (isSafeMode()) {
      const amount = SAFE_INVOICE_RE.exec(`${id}`)?.[1];
      return amount ? { status: 'PAID', amount: +amount } : undefined;
    }
    try {
      const res = await this.requestWithToken('GET', `payment/${id}`, {});
      return {
        status: res.payment_status,
        amount: res.payment_amount,
      };
    } catch (error) {}
  }

  // ✅ Төлбөр шалгах
  async checkPayment(invoiceId: string) {
    if (isSafeMode()) {
      // Mock invoice бол шууд төлөгдсөн гэж үзнэ; өөр (бодит prod) invoice бол төлөөгүй.
      const amount = SAFE_INVOICE_RE.exec(`${invoiceId}`)?.[1];
      safeLog(
        'QPay checkPayment (mock)',
        `invoice_id=${invoiceId} paid=${amount ?? 0}`,
      );
      return amount
        ? {
            count: 1,
            paid_amount: +amount,
            rows: [{ payment_status: 'PAID', payment_amount: +amount }],
          }
        : { count: 0, paid_amount: 0, rows: [] };
    }
    // ⚠️ Өмнө нь `await` дутуу байсан.
    const res = await this.requestWithToken('POST', '/payment/check', {
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    });
    return res;
  }
}
