import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosError } from 'axios';
import { LOCAL } from 'src/common/utils';
import { Receipt, ReceiptDocument } from './schema/receipt.schema';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BarimtDto, BarimtResponseDto, BarimtUserDto } from './dto/barimt.dto';
import { User, UserDocument } from './schema/user.schema';
import * as QRCode from 'qrcode';
import { MailerService } from '@nestjs-modules/mailer';
import { format } from 'date-fns';
import { UserEntity } from '../user/entities/user.entity';
@Injectable()
export class BarimtService {
  constructor(
    private readonly httpService: HttpService,
    private mailer: MailerService,
    @InjectModel(Receipt.name) private readonly receipt: Model<ReceiptDocument>,
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshing: Promise<string> | null = null;
  private token: string | null = null;
  public async loginEbarimt(): Promise<{ token: string; expiredIn: number }> {
    const now = Date.now();

    if (now < this.expiresAt && this.accessToken) {
      return {
        token: this.accessToken,
        expiredIn: Math.floor((this.expiresAt - now) / 1000),
      };
    }

    if (this.refreshing) {
      const token = await this.refreshing;
      return {
        token,
        expiredIn: Math.floor((this.expiresAt - Date.now()) / 1000),
      };
    }

    this.refreshing = this._getNewToken().finally(() => {
      this.refreshing = null;
    });

    const token = await this.refreshing;
    return {
      token,
      expiredIn: Math.floor((this.expiresAt - Date.now()) / 1000),
    };
  }

  private async _getNewToken(): Promise<string> {
    const now = Date.now();
    const user = await this.model.findById('67e9859ce3f8c9f425aa36ff');
    const url =
      'https://st.auth.itc.gov.mn/auth/realms/Staging/protocol/openid-connect/token';
    this.token = user.token;
    const params = new URLSearchParams({
      grant_type: user.type,
      client_id: user.clientId,
      username: user.username,
      password: user.password,
    });

    try {
      const res = await firstValueFrom(
        this.httpService.post(url, params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      const tokenData = res.data;
      this.accessToken = tokenData.access_token;
      this.expiresAt = now + tokenData.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      this.accessToken = null;
      this.expiresAt = 0;
      const axiosError = error as AxiosError;
      throw new HttpException(
        axiosError.response?.data || 'Authentication failed',
        500,
      );
    }
  }

  async restReceipt(
    dto: BarimtDto,
    user: UserEntity,
    price: number,
    service: number,
  ) {
    const d = {
      branchNo: '001',
      districtCode: '0101',
      merchantTin: '37900846788',
      posNo: '10008555',
      // ?
      // consumerNo: '10038071',
      type: 'B2C_RECEIPT',
      billIdSuffix: '100100015121212121111',
      reportMonth: null,
      receipts: dto.receipts.map((r) => {
        return {
          taxType: 'VAT_ABLE',
          merchantTin: '37900846788',
          items: r.items.map((r) => {
            return {
              name: r.name,
              barCode: '',
              barCodeType: 'UNDEFINED',
              classificationCode: '8122100',
              // "taxProductCode": "string",
              measureUnit: 'багц',
              qty: r.qty,
              unitPrice: r.unitPrice,
              totalVAT: 10,
              totalCityTax: 2,
            };
          }),
        };
      }),
      payments: dto.payments,
    };
    const { token } = await this.loginEbarimt();
    // return token;
    try {
      if (!d.receipts || d.receipts.length == 0)
        throw new HttpException('Мэдээлэл дутуу', HttpStatus.BAD_REQUEST);
      const receipts = await Promise.all(
        d.receipts.map(async (rec) => {
          const items = await Promise.all(
            rec.items.map((item) => {
              const {
                // taxProductCode,
                qty,
                unitPrice,
                totalVAT,
                totalCityTax,
                ...body
              } = item;
              let uPrice =
                Math.round(
                  (unitPrice / (1 + (totalVAT + totalCityTax) / 100)) * 100,
                ) / 100;
              // totalVAT 0 || 10
              const vat = Math.round(uPrice * totalVAT) / 100;
              // totalCityTax 0 || 2
              const tax = Math.round(uPrice * totalCityTax) / 100;
              const totalAmount = unitPrice * qty;
              console.log(vat, tax, uPrice, unitPrice);
              if (rec.taxType == 'VAT_FREE' || rec.taxType == 'VAT_ZERO')
                return {
                  ...body,
                  totalVAT: vat * qty,
                  totalCityTax: tax * qty,
                  totalAmount: totalAmount,
                  unitPrice: unitPrice,
                  // taxProductCode: taxProductCode,
                };
              return {
                ...body,
                totalVAT: vat * qty,
                totalCityTax: tax * qty,
                totalAmount: totalAmount,
                unitPrice: unitPrice,
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
        branchNo: d.branchNo,
        districtCode: d.districtCode,
        merchantTin: d.merchantTin,
        totalAmount,
        totalVAT,
        totalCityTax,
        posNo: d.posNo,
        type: d.type,
        // consumerNo: d.consumerNo,
        reportMonth: d.reportMonth ?? null,
        receipts,
        payments: d.payments,
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
      await this.saveReceipt(
        { ...res.data, totalAmount: price },
        this.token,
        service,
        user.id,
      );
      if (res.status != 200) throw new HttpException('', 500);
      const data: BarimtResponseDto = res.data;
      const qrdata = await this.generateQrImage(data.qrData);
      await this.sendEmail(user.email, data.lottery, `${price}`, qrdata);
      return {
        ...data,
        qrData: qrdata,
      };
    } catch (error) {
      console.log(error.response.data.message);
      // console.log(error.message);
    }
  }


  async getInformation() {
    try {
      const response = await axios.get(`${LOCAL}rest/info`, {
        headers: {
          Accept: 'application/json',
        },
      });
      console.log(response.data);
      return response.data
    } catch (error) {
      console.error(error);
    }
  }
  
  async sendEmail(
    email: string,
    lottery: string,
    price: string,
    qrdata?: string,
  ) {
    await this.mailer.sendMail({
      to: email,
      subject: 'И-баримт хүлээн авах',
      html: `<div>
   ${qrdata ? '<img src="cid:qrCode" alt="Qrcode" width="100" height="100" />' : ''}
    <p>${lottery}</p>
    <p>${price}₮</p>
    <p>Асууж, тодруулах зүйл байвал <a href=mailto:info@hire.mn>info@hire.mn</a> хаягаар, <a href=tel:976-9909 9371>976-9909 9371</a> дугаараар холбогдоорой. </p>
     <p>Манайхаар үйлчлүүлж байгаад тань баярлалаа.</p>
     <p>Шуудангийн хаяг: Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p>
     </div>`,
      attachments: [
        qrdata
          ? {
              filename: 'qrcode.png',
              content: qrdata.split(',')[1],
              encoding: 'base64',
              cid: 'qrCode',
            }
          : null,
      ],
    });
  }
  async generateQrImage(data: string): Promise<string> {
    try {
      const qr = await QRCode.toDataURL(data);
      return qr; // base64 PNG image (you can show this in <img src="...">)
    } catch (err) {
      throw new Error('QR code generation failed');
    }
  }

  async getBarimt(user: number, id: number, email: string) {
    try {
      const barimt = await this.receipt.findOne({
        service: id,
        userId: user,
      });
      if (!barimt) {
        throw new HttpException(
          'И-баримт бүртгэгдээгүй байна.',
          HttpStatus.NOT_FOUND,
        );
      }
      await this.sendEmail(
        email,
        barimt.lottery,
        barimt.totalAmount.toString(),
      );
    } catch (error) {
      console.log(error);
    }
  }

  async saveReceipt(data: any, token: string, service: number, id: number) {
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
      service: service,
      userId: id,
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

  async sendData() {
    try {
      const response = await axios.get(`${LOCAL}rest/sendData`, {
        headers: {
          Accept: 'application/json',
        },
      });
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  async deleteReceipt(id: string, d: string) {
    // Баримт хэвлэсэн огноо "yyyy-MM-dd HH:mm:ss" форматтай огноо
    const date = format(new Date(d), 'yyyy-MM-dd HH:mm:ss');
    try {
      const response = await axios.delete(`${LOCAL}rest/receipt`, {
        data: {
          id,
          date,
        },
        headers: {
          Accept: 'application/json',
        },
      });
      console.log(response.data);
    } catch (error) {
      console.log(error);
    }
  }
}
