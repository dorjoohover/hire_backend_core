// src/qpay/qpay.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, lastValueFrom } from 'rxjs';

@Injectable()
export class QpayService {
  private readonly logger = new Logger(QpayService.name);
  private readonly reauthenticateIntervalMs = 24 * 60 * 60 * 1000;

  private baseUrl = 'https://merchant.qpay.mn/v2/';
  private accessToken: string;
  private refreshToken: string;
  private expiresIn: Date;
  private reauthenticateAt: Date;

  constructor(private readonly httpService: HttpService) {}

  private setTokens(
    data: { access_token: string; refresh_token: string; expires_in: number },
    resetReauthenticateWindow = false,
  ) {
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresIn = new Date(Date.now() + data.expires_in * 1000);

    if (resetReauthenticateWindow || !this.reauthenticateAt) {
      this.reauthenticateAt = new Date(
        Date.now() + this.reauthenticateIntervalMs,
      );
    }
  }

  private shouldReauthenticate(now = new Date()) {
    return (
      !this.accessToken ||
      !this.refreshToken ||
      !this.reauthenticateAt ||
      now >= this.reauthenticateAt
    );
  }

  private isUnauthorized(error: any) {
    return error?.response?.status === 401;
  }

  private async refreshAccessToken() {
    try {
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

      this.setTokens(response.data);
      this.logger.log('QPay access token refreshed.');
    } catch (error) {
      this.logger.warn(
        `QPay refresh failed with status ${error?.response?.status ?? 'unknown'}.`,
      );
      throw error;
    }
  }

  private async ensureValidToken() {
    const now = new Date();

    if (this.shouldReauthenticate(now)) {
      this.logger.log('QPay 24 цагийн auth window дууссан тул дахин нэвтэрч байна.');
      await this.authenticate();
      return;
    }

    if (!this.expiresIn || now >= this.expiresIn) {
      this.logger.log('QPay access token хугацаа дууссан тул refresh хийж байна.');

      try {
        await this.refreshAccessToken();
      } catch (error) {
        if (this.isUnauthorized(error)) {
          this.logger.warn(
            'QPay refresh token хүчингүй болсон тул full authenticate хийж байна.',
          );
          await this.authenticate();
          return;
        }

        throw error;
      }
    }
  }

  private async recoverAuthorization() {
    if (this.shouldReauthenticate()) {
      this.logger.warn(
        'QPay request 401 буцаасан тул full authenticate хийж сэргээж байна.',
      );
      await this.authenticate();
      return;
    }

    try {
      await this.refreshAccessToken();
    } catch (error) {
      if (this.isUnauthorized(error)) {
        this.logger.warn(
          'QPay refresh 401 буцаасан тул full authenticate хийж сэргээж байна.',
        );
        await this.authenticate();
        return;
      }

      throw error;
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
      this.logger.error(
        `QPay ${method} ${endpoint} failed: ${
          error?.response?.data?.message ?? error?.message ?? 'Unknown error'
        }`,
      );

      if (this.isUnauthorized(error)) {
        await this.recoverAuthorization();

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

      this.setTokens(response.data, true);
      this.logger.log('QPay authentication succeeded.');
    } catch (e) {
      this.logger.error(
        `QPAY AUTH ERROR: ${JSON.stringify(e.response?.data || e.message)}`,
      );
      throw e;
    }
  }

  // ✅ Invoice үүсгэх
  async createInvoice(amount: number, invoiceId: number, userId: number) {
    try {
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
        callback_url: `${process.env.QPAY_CALLBACK}/${invoiceId}/${userId}`,
      });

      return res;
    } catch (error) {
      this.logger.error(
        `QPay invoice create failed: ${
          error?.response?.data?.message ?? error?.message ?? 'Unknown error'
        }`,
      );
      throw error;
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
    } catch (error) {
      this.logger.error(
        `QPay get invoice failed: ${
          error?.response?.data?.message ?? error?.message ?? 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  // ✅ Төлбөр шалгах
  async checkPayment(invoiceId: string) {
    try {
      const res = await this.requestWithToken('POST', 'payment/check', {
        object_type: 'INVOICE',
        object_id: invoiceId,
        offset: {
          page_number: 1,
          page_limit: 100,
        },
      });
      return res;
    } catch (error) {
      this.logger.error(
        `QPay payment check failed: ${
          error?.response?.data?.message ?? error?.message ?? 'Unknown error'
        }`,
      );
      throw error;
    }
  }
}
