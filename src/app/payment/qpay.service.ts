// src/qpay/qpay.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class QpayService {
  private readonly logger = new Logger(QpayService.name);

  private baseUrl = 'https://merchant.qpay.mn/v2/';
  private accessToken: string | null = null;

  // Токены жинхэнэ дуусах хугацаа (epoch ms). QPay-н expires_in нь
  // тогтворгүй (epoch эсвэл duration) ирдэг тул бид JWT-н дотоод
  // `exp` claim-ийг шууд уншиж тооцоолно.
  private accessTokenExp = 0;

  // Дуусахаас 5 минутын өмнө урьдчилан шинэчилнэ.
  private readonly EXPIRY_BUFFER_MS = 5 * 60 * 1000;

  // 4 instance / олон зэрэгцээ хүсэлт нэг дор authenticate хийхээс сэргийлж,
  // нэг л auth хүсэлтийг хуваалцана (single-flight).
  private authPromise: Promise<void> | null = null;

  constructor(private readonly httpService: HttpService) {}

  /** JWT-н `exp` (секунд) -> ms. Уншиж чадахгүй бол 0 буцаана. */
  private getJwtExpMs(token?: string): number {
    try {
      if (!token) return 0;
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return 0;
      const json = Buffer.from(payloadPart, 'base64').toString('utf8');
      const payload = JSON.parse(json);
      return payload?.exp ? Number(payload.exp) * 1000 : 0;
    } catch {
      return 0;
    }
  }

  private setTokens(data: any) {
    this.accessToken = data?.access_token ?? null;
    // QPay-н expires_in-д БҮҮ найд — JWT-н өөрийнх нь exp-ийг ашиглана.
    const jwtExp = this.getJwtExpMs(this.accessToken);
    // JWT-г уншиж чадаагүй бол найдвартай талд нь 50 минутаар авна.
    this.accessTokenExp = jwtExp || Date.now() + 50 * 60 * 1000;
  }

  /** client_id/secret-ээр шинээр authenticate хийнэ. */
  private async authenticate(): Promise<void> {
    const { data } = await firstValueFrom(
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

    this.setTokens(data);
    this.logger.log(
      `QPay authenticated. Token valid until ${new Date(
        this.accessTokenExp,
      ).toISOString()}`,
    );
  }

  /**
   * Токен хүчинтэй эсэхийг шалгаж, шаардлагатай бол дахин авна.
   * `force = true` үед хүчинтэй эсэхээс үл хамаарч дахин авна (401/403-ийн дараа).
   */
  private async ensureValidToken(force = false): Promise<void> {
    const stillValid =
      !!this.accessToken &&
      Date.now() < this.accessTokenExp - this.EXPIRY_BUFFER_MS;

    if (stillValid && !force) return;

    // Зэрэгцээ хүсэлтүүдийг нэг auth дээр нэгтгэнэ.
    if (!this.authPromise) {
      this.authPromise = this.authenticate()
        .catch((e) => {
          // Алдаа гарвал дараагийн хүсэлт дахин оролдох боломжтой байхын тулд
          // токеныг цэвэрлэнэ.
          this.accessToken = null;
          this.accessTokenExp = 0;
          this.logger.error(
            'QPay auth failed: ' +
              (e.response?.data
                ? JSON.stringify(e.response.data)
                : e.message),
          );
          throw e;
        })
        .finally(() => {
          this.authPromise = null;
        });
    }

    await this.authPromise;
  }

  private async doRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: any,
  ): Promise<T> {
    const res = await firstValueFrom(
      this.httpService.request({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        timeout: 15000,
      }),
    );
    return res.data;
  }

  private async requestWithToken<T = any>(
    method: 'GET' | 'POST',
    endpoint: string,
    data: any = {},
  ): Promise<T> {
    await this.ensureValidToken();

    try {
      return await this.doRequest<T>(method, endpoint, data);
    } catch (error) {
      const status = error.response?.status;
      // QPay токен хүчингүй болсон үед зөвхөн 401 биш, 403 ч буцааж болдог.
      if (status === 401 || status === 403) {
        this.logger.warn(
          `QPay ${status} on ${endpoint} → дахин authenticate хийж дахин оролдоно`,
        );
        await this.ensureValidToken(true); // force re-auth
        return await this.doRequest<T>(method, endpoint, data);
      }
      this.logger.error(
        `QPay request failed (${endpoint}): ` +
          (error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message),
      );
      throw error;
    }
  }

  // ✅ Invoice үүсгэх
  async createInvoice(amount: number, invoiceId: number, userId: number) {
    return await this.requestWithToken('POST', 'invoice', {
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
      callback_url: `${process.env.QPAY_CALLBACK}/${invoiceId}/${userId}`,
    });
  }

  // ✅ Invoice/Payment харах
  async getInvoice(id: string) {
    const res = await this.requestWithToken('GET', `payment/${id}`, {});
    return {
      status: res.payment_status,
      amount: res.payment_amount,
    };
  }

  // ✅ Төлбөр шалгах
  async checkPayment(invoiceId: string) {
    return await this.requestWithToken('POST', 'payment/check', {
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: {
        page_number: 1,
        page_limit: 100,
      },
    });
  }
}
