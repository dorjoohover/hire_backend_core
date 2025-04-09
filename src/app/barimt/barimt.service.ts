import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosError } from 'axios';
import { LOCAL } from 'src/common/utils';
import { Receipt, ReceiptDocument } from './schema/receipt.schema';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BarimtUserDto } from './dto/barimt.dto';
import { User } from './schema/user.schema';

@Injectable()
export class BarimtService {
  constructor(
    private readonly httpService: HttpService,
    @InjectModel(Receipt.name) private readonly receipt: Model<ReceiptDocument>,
    @InjectModel(User.name) private readonly model: Model<ReceiptDocument>,
  ) {}

  public async loginEbarimt(dto: BarimtUserDto) {
    const url =
      'https://st.auth.itc.gov.mn/auth/realms/Staging/protocol/openid-connect/token';
    const d = new URLSearchParams({
      grant_type: dto.grant_type,
      client_id: dto.client_id,
      username: dto.username,
      password: dto.password,
    });
    try {
      const res = await firstValueFrom(
        this.httpService.post(url, d, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      if (res.status != 200)
        throw new HttpException(res.data, HttpStatus.BAD_REQUEST);
      const data = res.data;
      return {
        token: data.access_token,
        expiredIn: data.expires_in,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data || 'Authentication failed',
        500,
      );
    }
  }

  async restReceipt(dto: any, token: string) {
    try {
      if (!dto.receipts || dto.receipts.length == 0)
        throw new HttpException('Мэдээлэл дутуу', HttpStatus.BAD_REQUEST);
      const receipts = await Promise.all(
        dto.receipts.map(async (rec) => {
          const items = await Promise.all(
            rec.items.map((item) => {
              const {
                taxProductCode,
                qty,
                unitPrice,
                totalVAT,
                totalCityTax,
                ...body
              } = item;
              // totalVAT 0 || 10
              const vat = Math.round((unitPrice / 100) * totalVAT);
              // totalCityTax 0 || 2
              const tax = Math.round((unitPrice / 100) * totalCityTax);
              const uPrice = unitPrice + vat + tax;
              const totalAmount = uPrice * qty;

              if (rec.taxType == 'VAT_FREE' || rec.taxType == 'VAT_ZERO')
                return {
                  ...body,
                  totalVAT: vat * qty,
                  totalCityTax: tax * qty,
                  totalAmount: totalAmount,
                  unitPrice: uPrice,
                  taxProductCode: taxProductCode,
                };
              return {
                ...body,
                totalVAT: vat * qty,
                totalCityTax: tax * qty,
                totalAmount: totalAmount,
                unitPrice: uPrice,
              };
            }),
          );
          const amount = items.reduce((a, b) => a + b.totalAmount, 0);
          const vat =
            rec.taxType != 'VAT_ABLE'
              ? 0
              : items.reduce((a, b) => a + b.totalVAT, 0);
          const tax = items.reduce((a, b) => a + b.totalCityTax, 0);
          return {
            ...rec,
            items,
            totalAmount: amount,
            totalVAT: vat,
            totalCityTax: tax,
          };
        }),
      );

      const totalAmount = receipts.reduce((a, b) => a + b.totalAmount, 0);
      const totalVAT = receipts.reduce((a, b) => a + b.totalVAT, 0);
      const totalCityTax = receipts.reduce((a, b) => a + b.totalCityTax, 0);

      const body = {
        branchNo: dto.branchNo,
        districtCode: dto.districtCode,
        merchantTin: dto.merchantTin,
        totalAmount,
        totalVAT,
        totalCityTax,
        posNo: dto.posNo,
        type: dto.type,
        consumerNo: dto.consumerNo,
        reportMonth: dto.reportMonth ?? null,
        receipts,
        payments: dto.payments,
      };
      const res = await axios.post(
        `${LOCAL}rest/receipt`,
        JSON.stringify(body),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      await this.saveReceipt(res.data, dto.token);
      return res.data;
    } catch (error) {
      console.log(error.message);
    }
  }

  async saveReceipt(data: any, token: string) {
    const body: Receipt = {
      date: data.date,
      easy: data.easy,
      id: data.id,
      lottery: data.lottery,
      //   qrData: data.qrData,
      status: data.status,
      totalAmount: data.totalAmount,
      totalCityTax: data.totalCityTax,
      totalVAT: data.totalVAT,
    };
    const receipt = await this.receipt.create(body);
    await this.model
      .findOneAndUpdate(
        {
          token,
        },
        {
          $push: { receipts: receipt._id },
        },
      )
      .exec();
  }
}
