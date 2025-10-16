import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { MailerService } from '@nestjs-modules/mailer';
import { BarimtDto, BarimtResponseDto } from './dto/barimt.dto';
import { UserEntity } from '../user/entities/user.entity';
import { format } from 'date-fns';
import { EmailLogService } from '../email_log/email_log.service';
import { EmailLogStatus, EmailLogType } from 'src/base/constants';
@Injectable()
export class BarimtService {
  constructor(
    private mailer: MailerService,
    @Inject(forwardRef(() => EmailLogService))
    private mailLog: EmailLogService,
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
        axiosError.response?.data || 'Authentication failed',
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
    const log = await this.mailLog.create({
      toEmail: email,
      action: 'баримт үүсгэх',
      subject: 'И-баримт хүлээн авах',
      url: BarimtService.name,
      type: EmailLogType.EBARIMT,
    });
    try {
      await this.mailer.sendMail({
        to: email,
        subject: 'И-баримт хүлээн авах',
        html: `
    <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 20px; border-radius: 8px;">
        ${
          qrdata
            ? `
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="cid:qrCode" alt="QR Code"
               style="width: 300px; height: 300px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px;" />
        </div>`
            : ''
        }
        <h2 style="color: #333333; margin-bottom: 16px;">И-баримтын мэдээлэл</h2>
        <p style="margin: 8px 0;"><strong>Сугалаа:</strong> ${dto.lottery}</p>
        <p style="margin: 8px 0;"><strong>Үнийн дүн:</strong> ${dto.totalAmount}₮</p>
        <p style="margin: 8px 0;"><strong>НӨАТ:</strong> ${dto.noat}₮</p>
        ${dto.tax ? `<p style="margin: 8px 0;"><strong>НХАТ:</strong> ${dto.tax}₮</p>` : ''}
        <p style="margin: 8px 0;"><strong>ДДТД:</strong> ${dto.ddtd}</p>
        <p style="margin: 8px 0;"><strong>ТТД (Татварын дугаар):</strong> ${dto.tin}</p>
        <p style="margin: 8px 0;"><strong>Огноо:</strong> ${dto.date}</p>
        <hr style="border:none; border-top:1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 14px; color: #555555; margin-bottom: 16px;">
          Асууж, тодруулах зүйл байвал
          <a href="mailto:info@hire.mn" style="color: #1a73e8; text-decoration: none;">info@hire.mn</a> болон
          <a href="tel:97699099371" style="color: #1a73e8; text-decoration: none;">976-9909 9371</a> холбогдоно уу.
        </p>
        <p style="font-size: 14px; color: #555555; margin-bottom: 16px;">
          Манайхаар үйлчлүүлсэнд баярлалаа.
        </p>
        <p style="font-size: 12px; color: #999999; line-height: 1.4;">
          Шуудангийн хаяг:<br/>
          Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5,<br/>
          СЭЗИС, Б байр, 7-р давхар, 13381<br/>
          Ш/Н: Улаанбаатар-49
        </p>
      </div>
    </div>
  `,
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
      await this.mailLog.updateStatus(log, EmailLogStatus.SENT);
    } catch (error) {
      await this.mailLog.updateStatus(
        log,
        EmailLogStatus.FAILED,
        error.message,
      );
    }
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
