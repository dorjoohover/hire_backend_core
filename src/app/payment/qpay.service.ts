// src/qpay/qpay.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';
@Injectable()
export class QpayService {
  private readonly logger = new Logger(QpayService.name);

  private baseUrl = 'https://merchant.qpay.mn/v2/';
  private accessToken: string;
  private refreshToken: string;
  private expiresIn: Date;

  constructor(private readonly httpService: HttpService) {}
  private async refreshAccessToken() {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.refreshToken}`,
          },
        },
      ),
    );

    const data = response.data;
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresIn = new Date(Date.now() + data.expires_in * 1000);
    console.log(
      'Access token refreshed:',
      this.accessToken.slice(0, 20),
      '...',
      new Date(),
    );
  }

  private async ensureValidToken() {
    const now = new Date();

    if (!this.accessToken || now > this.expiresIn) {
      const diff = this.expiresIn
        ? now.getTime() - this.expiresIn.getTime()
        : 0;

      if (this.refreshToken && diff < 24 * 60 * 60 * 1000) {
        console.log('Token expired → Refreshing...');
        await this.refreshAccessToken();
      } else {
        console.log('24 цаг өнгөрсөн → Re-authenticating...');
        await this.authenticate();
      }
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
      console.log(error.response.data.message);
      if (error.response?.status === 401) {
        await this.refreshAccessToken();
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
      this.refreshToken = response.data.refresh_token;
      this.expiresIn = new Date(Date.now() + response.data.expires_in * 1000);
    } catch (e) {
      console.error('QPAY AUTH ERROR:', e.response?.data || e.message);
      throw e;
    }
  }

  // ✅ Invoice үүсгэх
  async createInvoice(amount: number, invoiceId: number, userId: number) {
    try {
      const res = this.requestWithToken('POST', 'invoice', {
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

      return res;
    } catch (error) {
      console.log(error);
    }
  }

  // ✅ Invoice харах
  async getInvoice(id: string) {
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
    const res = this.requestWithToken('POST', '/payment/check', {
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
