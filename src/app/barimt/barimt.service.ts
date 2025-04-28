import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { MailerService } from '@nestjs-modules/mailer';
import { BarimtDto, BarimtResponseDto } from './dto/barimt.dto';
import { UserEntity } from '../user/entities/user.entity';
import { format } from 'date-fns';
@Injectable()
export class BarimtService {
  constructor(
    private readonly httpService: HttpService,
    private mailer: MailerService,
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
      this.expiresAt = now + tokenData.expiredIn * 1000;
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
              classificationCode: '8122100',
              // "taxProductCode": "string",
              measureUnit: 'багц',
              qty: r.qty,
              unitPrice: r.unitPrice,
              totalVAT: 10,
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
      const data: BarimtResponseDto = res.data;
      if (data?.status != 'SUCCESS') throw new HttpException('', 500);
      await this.sendEmail(user.email, data, data?.qrData);
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
    await this.mailer.sendMail({
      to: email,
      subject: 'И-баримт хүлээн авах',
      html: `<div>
   ${qrdata ? '<img src="cid:qrCode" alt="Qrcode" width="200" height="200" />' : ''}
    <p>Сугалаа:${dto.lottery}</p>
    <p>Үнйин дүн:${dto.totalAmount}₮</p>
    <p>НӨАТ:${dto.noat}₮</p>
    ${dto.tax && `<p>НХАТ:${dto.tax}₮</p>`}
    <p>ДДТД:${dto.ddtd}</p>
    <p>Нэр:${dto.name}</p>
    <p>ТТД:${dto.tin}</p>
    <p>Огноо:${dto.date}</p>
    <p>Асууж, тодруулах зүйл байвал <a href=mailto:info@hire.mn>info@hire.mn</a> хаягаар, <a href=tel:976-9909 9371>976-9909 9371</a> дугаараар холбогдоорой. </p>
     <p>Манайхаар үйлчлүүлж байгаад тань баярлалаа.</p>
     <p>Шуудангийн хаяг: Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p>
     </div>`,
      attachments: qrdata
        ? [
            {
              filename: 'qrcode.png',
              content: qrdata.split(',')[1],
              encoding: 'base64',
              cid: 'qrCode',
            },
          ]
        : [],
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
      await this.sendEmail(email, barimt);
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

  async deleteReceipt(id: string, d: string) {
    // Баримт хэвлэсэн огноо "yyyy-MM-dd HH:mm:ss" форматтай огноо
    const date = format(new Date(d), 'yyyy-MM-dd HH:mm:ss');
    try {
      const response = await axios.delete(`${process.env.BARIMT_KEY}receipt`, {
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
