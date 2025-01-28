import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class QpayService {
  private readonly baseUrl = 'https://merchant.qpay.mn/v2'; // Update to the correct QPay API base URL

  constructor(private readonly httpService: HttpService) {}

  async getAccessToken() {
    const response = await this.httpService
      .post(
        `${this.baseUrl}/auth/token`,
        {},
        {
          auth: {
            username: process.env.QPAY_CLIENT_ID,
            password: process.env.QPAY_CLIENT_SECRET,
          },
        },
      )
      .toPromise();
    console.log(response.data.access_token);
    return response.data.access_token;
  }

  async createPayment(amount: number, invoiceId: string) {
    const accessToken = await this.getAccessToken();

    const response = await this.httpService
      .post(
        `${this.baseUrl}/invoice`,
        {
          invoice_code: 'AXIOM_INC_INVOICE',
          sender_invoice_no: '9329873948',
          sender_branch_code: 'hire',
          invoice_receiver_code: 'user_id_1',
          amount,
          invoice_description: 'Invoice description',
          invoice_due_date: null,
          allow_partial: false,
          minimum_amount: null,
          allow_exceed: false,
          maximum_amount: null,
          note: null,
          callback_url: 'http://srv666826.hstgr.cloud/api/v1/qpay/callback',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      )
      .toPromise();

    return response.data;
  }

  async checkPayment(id: string) {
    const accessToken = await this.getAccessToken();
    const response = await lastValueFrom(
      this.httpService.post(
        `${this.baseUrl}/payment/check`,
        {
          object_type: 'INVOICE',
          object_id: id,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    return response.data;
  }
}
