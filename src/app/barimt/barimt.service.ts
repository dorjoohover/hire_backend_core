import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { BarimtDto, BarimtResponseDto } from './dto/barimt.dto';
import { UserEntity } from '../user/entities/user.entity';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
@Injectable()
export class BarimtService {
  constructor(
    @Inject(forwardRef(() => EmailService))
    private mailer: EmailService,
  ) {}

  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshing: Promise<string> | null = null;
  private token: string | null = null;
  public async loginEbarimt(): Promise<{ token: string; expiredIn: number }> {
    const now = Date.now();

    // Хэрвээ token хүчинтэй байвал шууд буцаана
    if (this.accessToken && now < this.expiresAt - 5_000) {
      // ⬅️ 5 секундийн "safety margin" нэмлээ
      return {
        token: this.accessToken,
        expiredIn: Math.floor((this.expiresAt - now) / 1000),
      };
    }

    // Хэрвээ аль хэдийн refresh хийж байгаа бол түүнийг хүлээнэ
    if (this.refreshing) {
      const token = await this.refreshing;
      return {
        token,
        expiredIn: Math.floor((this.expiresAt - Date.now()) / 1000),
      };
    }

    // Шинэ token авах
    this.refreshing = this._getNewToken().finally(() => {
      this.refreshing = null;
    });

    const token = await this.refreshing;
    if (!token) {
      throw new HttpException('Ebarimt token invalid', 401);
    }
    return {
      token,
      expiredIn: Math.floor((this.expiresAt - Date.now()) / 1000),
    };
  }

  private async _getNewToken(): Promise<string> {
    const url = `${process.env.BARIMT_URL}login`;

    try {
      const res = await axios.post(
        url,
        {
          username: process.env.BARIMT_USERNAME,
          password: process.env.BARIMT_PASSWORD,
        },
        {
          headers: {
            'x-api-key': process.env.BARIMT_KEY,
          },
        },
      );

      const tokenData = res.data;
      this.accessToken = tokenData.accessToken;
      this.expiresAt = Date.now() + tokenData.expiredIn * 1000;

      console.log(
        `[Ebarimt] New token acquired, expires in ${tokenData.expiredIn} sec`,
      );

      return this.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.accessToken = null;
      this.expiresAt = 0;

      console.error('[Ebarimt] Token fetch failed:', axiosError.response?.data);
      throw new HttpException(
        axiosError.response?.data || 'Ebarimt нэвтрэх token авч чадсангүй',
        axiosError.response?.status || 500,
      );
    }
  }

  async restReceipt(
    dto: BarimtDto,
    user: UserEntity,
    price: number,
    service: number,
  ) {
    const { token } = await this.loginEbarimt();
    console.log(token);
    const d = {
      branchNo: '001',
      posNo: '10008555',
      // ?
      // consumerNo: '10038071',
      regNo: '',
      type: 10,
      billIdSuffix: dto.billIdSuffix,
      reportMonth: null,
      receipts: dto.receipts.map((r) => {
        return {
          taxType: 10,
          items: r.items.map((r) => {
            return {
              name: r.name,
              barCode: null,
              barCodeType: 10,
              classificationCode: '8311391',
              // "taxProductCode": "string",
              measureUnit: 'багц',
              qty: r.qty,
              unitPrice: r.unitPrice,
              totalVAT: 10,
            };
          }),
        };
      }),
      easy: true,
      payments: dto.payments,
    };

    // return token;
    try {
      if (!d.receipts || d.receipts.length == 0)
        throw new HttpException('Мэдээлэл дутуу', HttpStatus.BAD_REQUEST);
      const body = {
        ...d,
      };
      const res = await axios.post(
        `${process.env.BARIMT_URL}receipt/rest`,
        JSON.stringify(body),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-api-key': process.env.BARIMT_KEY,
          },
        },
      );
      const data: BarimtResponseDto = await res.data;
      if (data?.status != 'SUCCESS') throw new HttpException('', 500);
      console.log(data.noat);
      this.sendEmail(user.email, data, data?.qrData);
      return {
        ...data,
      };
    } catch (error) {
      console.log(error);
      // console.log(error.message);
    }
  }

  // async getInformation() {
  //   try {
  //     const response = await axios.get(`${LOCAL}rest/info`, {
  //       headers: {
  //         Accept: 'application/json',
  //       },
  //     });
  //     console.log(response.data);
  //     return response.data
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  async sendEmail(email: string, dto: any, qrdata?: string) {
    await this.mailer.sendEBarimtMail({
      date: dto.date,
      ddtd: dto.ddtd,
      email,
      lottery: dto.lottery,
      tin: dto.tin,
      noat: dto.noat,
      qrdata: qrdata,
      tax: dto.tax,
      totalAmount: dto.totalAmount,
    });
  }

  async getBarimt(id: number, email: string) {
    try {
      const { token } = await this.loginEbarimt();

      const response = await axios.get(
        `${process.env.BARIMT_URL}receipt/get/${id}`,
        {
          headers: {
            Accept: 'application/json',
            'x-api-key': process.env.BARIMT_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log(response.data);
      const barimt = response.data;
      if (!barimt) {
        throw new HttpException(
          'И-баримт бүртгэгдээгүй байна.',
          HttpStatus.NOT_FOUND,
        );
      }
      // this.sendEmail(email, barimt);
      return barimt;
    } catch (error) {
      console.log(error);
    }
  }

  async sendData() {
    try {
      const { token } = await this.loginEbarimt();

      const response = await axios.get(
        `${process.env.BARIMT_URL}receipt/send`,
        {
          headers: {
            Accept: 'application/json',
            'x-api-key': process.env.BARIMT_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  }
  async getinformation() {
    try {
      const response = await axios.get(
        `${process.env.BARIMT_URL}receipt/info`,
        {
          headers: {
            Accept: 'application/json',
            'x-api-key': process.env.BARIMT_KEY,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error(error);
    }
  }

  async deleteReceipt(id: number) {
    // Баримт хэвлэсэн огноо "yyyy-MM-dd HH:mm:ss" форматтай огноо
    const { token } = await this.loginEbarimt();
    try {
      const response = await axios.delete(`${process.env.BARIMT_URL}receipt`, {
        data: {
          id,
        },
        headers: {
          Accept: 'application/json',
          'x-api-key': process.env.BARIMT_KEY,
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response.data.data);
      if (response.data.data.statusCode == 500) {
        return response.data.data.message;
      }
    } catch (error) {
      // return
      console.log(error.message);
      return 'Баримт олдсонгүй';
    }
  }
}
