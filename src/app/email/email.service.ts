import { InjectQueue } from '@nestjs/bullmq';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EmailLogService } from '../email_log/email_log.service';
import { EmailLogStatus, EmailLogType } from 'src/base/constants';
import { EmailJobPayload } from './email.dto';
import { AssessmentEntity } from '../assessment/entities/assessment.entity';
import { UserServiceService } from '../user.service/user.service.service';
import { UserAnswerService } from '../user.answer/user.answer.service';

@Injectable()
export class EmailService {
  constructor(
    @Inject(forwardRef(() => EmailLogService))
    private readonly maillog: EmailLogService,
    @Inject(forwardRef(() => UserAnswerService))
    private readonly answer: UserAnswerService,
    @Inject(forwardRef(() => UserServiceService))
    private readonly userService: UserServiceService,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}
  private async logAndQueue(payload: EmailJobPayload) {
    let log = payload.logId;
    console.log(log);
    if (payload.logId == undefined) {
      log = await this.maillog.create({
        toEmail: payload.to,
        subject: payload.subject,
        type: payload.type,
        action: 'SEND_EMAIL',
        url: EmailService.name,
        code: payload.meta?.code,
        status: EmailLogStatus.PENDING,
        firstname: payload.meta?.firstname,
        lastname: payload.meta?.lastname,
        phone: payload.meta?.phone,
        assessmentName: payload.meta?.assessmentName,
        visible: payload.meta?.visible,
        attempts: 0,
      });
    }
    console.log(log);
    await this.emailQueue.add(
      'send-email',
      {
        ...payload,
        logId: log,
      },
      {
        delay: 10000,
      },
    );
  }
  public async resend(id: number, type: EmailLogType) {
    const log = await this.maillog.findOne(id);

    if (type == EmailLogType.REPORT) {
      await this.answer.createReport(log.code);
      await this.answer.sendEmail(log.code, id);
    }
    if (type == EmailLogType.INVITATION) {
      await this.userService.sendLinkToMail({
        links: [
          {
            code: log.code,
            email: log.toEmail,
            firstname: log.firstname,
            lastname: log.lastname,
            phone: log.phone,
            visible: log.visible,
          },
        ],
      });
    }
  }

  /* -------------------- PUBLIC API -------------------- */

  async sendReportMail(input: {
    email: string;
    id: number;
    name: string;
    code: string;
    assessmentName?: string;
    logId?: number;
  }) {
    const html = this.generateReportTemplate(input.id, input.name, +input.code);

    await this.logAndQueue({
      type: EmailLogType.REPORT,
      to: input.email,
      subject: 'Таны тайлан бэлэн боллоо',
      html,
      meta: { code: input.code, assessmentName: input.assessmentName },
      logId: input.logId,
    });
  }

  async sendInvitation(input: {
    isNewUser: boolean;
    email: string;
    password?: string;
    lastname: string;
    firstname: string;
    orgName?: string;
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    visible: boolean;
    phone: string;
    code: string;
    id?: number;
    assessmentName?: number;
    assessment: AssessmentEntity;
  }) {
    if (input.id) {
    }
    const { html } = this.sendInvitationTemplate({
      ...input,
    });
    await this.logAndQueue({
      type: EmailLogType.INVITATION,
      to: input.email,
      subject: 'Танд тестийн урилга ирлээ',
      html,
      meta: {
        url: UserServiceService.name,
        type: EmailLogType.INVITATION,
        code: input.code,
        assessmentName: input.assessment?.name,
        firstname: input.firstname,
        lastname: input.lastname,
        phone: input.phone,
        visible: input.visible,
        action: 'sent invitation',
      },
    });
  }
  async sendVerification(input: { email }) {
    const { html } = this.generateVerificationTemplate(input);

    await this.logAndQueue({
      type: EmailLogType.VERIFICATION,
      to: input.email,
      subject: 'И-мэйл хаяг баталгаажуулах тухай',
      html,
    });
  }
  async sendOtp(input: { code: string; email: string }) {
    const { html } = this.generateOtpTemplate(input);

    await this.logAndQueue({
      type: EmailLogType.VERIFICATION,
      to: input.email,
      subject: 'Нууц үг сэргээх тухай',
      html,
    });
  }

  async sendEBarimtMail(input: {
    email: string;
    qrdata?: string;
    tax?: string;
    lottery: string;
    totalAmount?: string;
    noat?: string;
    ddtd: string;
    date: string;
    tin: string;
  }) {
    const { html, attachments } = this.generateEBarimtTemplate(input);

    await this.logAndQueue({
      type: EmailLogType.EBARIMT,
      to: input.email,
      subject: 'И-баримт хүлээн авах',
      html,
      attachments,
    });
  }

  /* -------------------- TEMPLATES -------------------- */

  private generateReportTemplate(
    id: number,
    name: string,
    code: number,
  ): string {
    return this.generateEmailTemplate(id, name, code);
  }
  private generateEBarimtTemplate(input: {
    qrdata?: string;
    tax?: string;
    lottery: string;
    totalAmount?: string;
    noat?: string;
    ddtd: string;
    date: string;
    tin: string;
  }): { html: string; attachments?: any[] } {
    const { qrdata, lottery, totalAmount, noat, tax, ddtd, date, tin } = input;
    const html = `
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
        <p style="margin: 8px 0;"><strong>Сугалаа:</strong> ${lottery}</p>
        <p style="margin: 8px 0;"><strong>Үнийн дүн:</strong> ${totalAmount}₮</p>
        <p style="margin: 8px 0;"><strong>НӨАТ:</strong> ${noat}₮</p>
        ${tax ? `<p style="margin: 8px 0;"><strong>НХАТ:</strong> ${tax}₮</p>` : ''}
        <p style="margin: 8px 0;"><strong>ДДТД:</strong> ${ddtd}</p>
        <p style="margin: 8px 0;"><strong>ТТД (Татварын дугаар):</strong> ${tin}</p>
        <p style="margin: 8px 0;"><strong>Огноо:</strong> ${date}</p>
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
  `;

    const attachments = input.qrdata
      ? [
          {
            filename: 'qrcode.png',
            content: input.qrdata.split(',')[1],
            encoding: 'base64',
            cid: 'qrCode',
          },
        ]
      : [];

    return { html, attachments };
  }

  private generateEmailTemplate(
    id: number,
    name: string,
    code: number,
  ): string {
    return `
 <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Таны тайлан бэлэн боллоо</title>
              <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
              body, h1, h2, h3, p, a, div {
                font-family: 'Montserrat', sans-serif;
              }
            </style>
            </head>
            <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
              <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                  <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                  <td>
                  
                  <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
                    <tr>
                      <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="width: 80%; text-align: left; vertical-align: middle;">
            <img src="https://raw.githubusercontent.com/usukhbaya12/images/refs/heads/main/hire-2-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
              </td>
        <td style="width: 20%; text-align: right; vertical-align: middle;">
                <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
                  <tr>
                    <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
                      <a href="${process.env.WEB || 'https://hire.mn'}" 
                        style="padding: 10px 16px; border-radius: 4px; 
                                color: #ff5000 !important; 
                                font-family: 'Montserrat', Arial, sans-serif; 
                                font-size: 14px; font-weight: 600; 
                                text-decoration: none; 
                                display: inline-block;
                                mso-line-height-rule: exactly;
                                line-height: 1.2;
                                text-align: center;">
                        Зочлох
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
                        </td>
                    </tr>
                    
                    <tr>
                      <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                              Өдрийн мэнд,
                            </td>
                          </tr>
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                              <p style="margin: 0 0 15px 0;">
                                <br/>Таны онлайн тест, үнэлгээний Hire.mn платформ дээр өгсөн <a href=${process.env.WEB || 'https://hire.mn'}/test/${id} style="color: #ff5000; font-weight: 700; text-decoration: none;">${name}</a> тестийн тайлан бэлэн боллоо. Та тайлангаа <a style="color: #ff5000; text-decoration: none;" href=${process.env.WEB || 'https://hire.mn'}/api/report/${code}>энд дарж</a> татаж авна уу.
                              </p>
                            </td>
                          </tr>
                          <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Тайлангийн электрон хувилбарыг Hire.mn сайт руу нэвтэрч, “Өгсөн тестүүд” булангаас харах боломжтой. Тайлантай холбоотой асууж тодруулах зүйл гарвал ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> мэйл хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                            </p>
                          </td>
                        </tr>
                          <tr>
                            <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                              <p style="margin: 0 0 15px 0;">
                                Хүндэтгэсэн,<br/>Hire.mn
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <tr>
                      <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
                      </td>
                    </tr>
                  </table>
                  
                  </td>
                  </tr>
                  </table>
                </div>
              </center>
            </body>
            </html>
   
  `;
  }

  private sendInvitationTemplate(input: {
    isNewUser: boolean;
    email: string;
    password?: string;
    lastname: string;
    firstname: string;
    orgName?: string;
    year: string;
    month: string;
    day: string;
    hour: string;
    minute: string;
    code: string;
    assessment: AssessmentEntity;
  }) {
    const {
      password,
      email,
      isNewUser,
      lastname,
      firstname,
      orgName,
      year,
      month,
      day,
      code,
      hour,
      assessment,
      minute,
    } = input;
    const newUserSection = isNewUser
      ? `
              <tr>
                <td style="background-color: #e8f5e8; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; font-family: 'Montserrat', sans-serif; text-align: justify;">
                  <h3 style="color: #2E7D32; margin: 0 0 10px 0; font-size: 16px;">
                    Hire.mn-д тавтай морил!
                  </h3>

                  <p style="color: #333333; margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;">
                    Таны и-мэйл хаяг манай сайтад автоматаар бүртгэгдэж байгаа бөгөөд тестээ өгч дууссаны дараа
                    <strong>Миний бүртгэл</strong> цэс рүү орж нууц үгээ солино уу.
                  </p>

                  <p style="color: #333333; margin: 0; font-size: 14px; line-height: 1.5;">
                    Нэвтрэх и-мэйл хаяг: <strong>${email}</strong>
                  </p>
                  <p style="color: #333333; margin: 0; font-size: 14px; line-height: 1.5;">
                    Нууц үг: <strong>${password}</strong>
                  </p>
                </td>
              </tr>
        `
      : '';
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Танд тестийн урилга ирлээ</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      body, h1, h2, h3, p, a, div {
        font-family: 'Montserrat', sans-serif;
      }
    </style>
  </head>
  <body
    style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;"
  >
    <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
      <div style="max-width: 600px; margin: 0 auto;">
        <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
            <td>
              <table
                align="center"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;"
              >
                <tr>
                  <td style="background-color: #ff5000; padding: 20px 40px; text-align: left;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 80%; text-align: left; vertical-align: middle;">
                          <img
                            src="https://raw.githubusercontent.com/usukhbaya12/images/refs/heads/main/hire-2-white.png"
                            alt="Hire.mn Logo"
                            width="120"
                            height="auto"
                            style="display: block; border: 0;"
                          />
                        </td>
                        <td style="width: 20%; text-align: right; vertical-align: middle;">
                          <table
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            align="right"
                            style="display: inline-block;"
                          >
                            <tr>
                              <td
                                style="border-radius: 99px; background-color:  #ffffff; mso-padding-alt: 10px 16px; text-align: center;"
                              >
                                <a
                                  style="padding: 10px 16px; border-radius: 4px; 
                              color: #ff5000 !important; 
                              font-family: 'Montserrat', Arial, sans-serif; 
                              font-size: 14px; font-weight: 600; 
                              text-decoration: none; 
                              display: inline-block;
                              mso-line-height-rule: exactly;
                              line-height: 1.2;
                              text-align: center;"
                                >
                                  ⭐️
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${newUserSection} ${isNewUser ? '<br />' : ''}
                      <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;"
                        >
                          Өдрийн мэнд,
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;"
                        >
                          <br />Эрхэм <strong>${lastname}</strong> овогтой
                          <strong>${firstname}</strong> танд
                          <strong>${orgName ?? ''}</strong> байгууллагаас
                          <strong style="color: #ff5000;">${assessment?.name}</strong> онлайн тест,
                          үнэлгээнд оролцох урилга илгээсэн байна. 
                        </td>
                      </tr>
                       <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;"
                        >
                          <br />Та <strong>тест өгөх</strong> товч дээр дарж тест, үнэлгээндээ оролцоно уу. Тус товч дээр дарснаар тест автоматаар эхлэх тул тестийн тухай мэдээлэл, асуумжид хариулах заавартай нухацтай танилцаарай.
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;"
                        >
                          <br />Тест, үнэлгээний линк ${year} оны ${month} сарын ${day} өдрийн
                          ${hour}:${minute} цаг хүртэл хүчинтэй ажиллахыг анхаарна уу. Танд амжилт
                          хүсье.
                        </td>
                      </tr>
                      <br />
                      <tr>
                        <td style="padding: 15px 0; text-align: center;">
                          <table cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                              <td style="background: linear-gradient(135deg, #ff5000 0%, #ff7a3d 100%); box-shadow: 0 4px 15px rgba(255, 80, 0, 0.3);">
                                <a
                                  href="${process.env.WEB || 'https://hire.mn'}/exam/${code}"
                                  style="display: inline-block; padding: 16px 40px; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 800; color: #ffffff !important; text-decoration: none; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.5px;"
                                >
                                  🎯  Тест өгөх
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <br />
                      <tr>
                        <td
                          style="background-color:rgb(255, 249, 178); padding: 15px; margin: 25px 0 10px 0; border-left: 4px solid rgb(255, 213, 0); font-family: 'Montserrat', sans-serif; text-align: justify;"
                        >
                          <h3 style="color: #ff5000; margin: 0 0 10px 0; font-size: 16px;">
                            ${assessment.name} тестийн тухай
                          </h3>
                          <p
                            style="color: #333333; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;"
                          >
                            ${assessment.description}
                          </p>
                          <p style="color: #ff5000; margin: 0; font-size: 14px; line-height: 1.5;">
                            <strong>Хэрэглээ</strong>
                          </p>
                          <p
                            style="color: #333333; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;"
                          >
                            ${assessment.usage}
                          </p>
                          <p style="color: #ff5000; margin: 0; font-size: 14px; line-height: 1.5;">
                            <strong>Хэмжих зүйлс</strong>
                          </p>
                          <p
                            style="color: #333333; margin: 0 0 10px 0; font-size: 14px; line-height: 1.5;"
                          >
                            ${assessment.measure}
                          </p>
                          <p style="color: #ff5000; margin: 0; font-size: 14px; line-height: 1.5;">
                            <strong>Асуумжид хариулах заавар</strong>
                          </p>
                          <div style="color: #333333; font-size: 14px; line-height: 1.5;">
                            <style>
                              .advice-content p {
                                margin: 0 0 10px 0 !important;
                                font-size: 14px !important;
                                line-height: 1.5 !important;
                              }
                            </style>
                            <div class="advice-content">
                              ${assessment.advice}
                            </div>
                          </div>
                        </td>
                      </tr>
                      <br />

                      <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;"
                        >
                          <p style="margin: 0 0 15px 0;">
                            <br />Тест, үнэлгээтэй холбоотой асууж тодруулах зүйл гарвал ажлын
                            өдрүүдэд 09-18 цагийн хооронд
                            <a
                              href="mailto:info@hire.mn"
                              style="color: #ff5000; text-decoration: none;"
                              >info@hire.mn</a>
                            мэйл хаягаар эсвэл
                            <a
                              href="tel:976-9909 9371"
                              style="color: #ff5000; text-decoration: none;"
                              >976-9909 9371</a>
                            утсаар холбогдоно уу.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td
                          style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;"
                        >
                          <p style="margin: 0 0 15px 0;">Хүндэтгэсэн,<br />Hire.mn</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td
                    style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;"
                  >
                    <p style="margin: 0; line-height: 1.5;">
                      Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р
                      хороо<br />Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н:
                      Улаанбаатар-49
                    </p>
                    <br />
                    <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </center>
  </body>
</html>
`;
    return { html };
  }

  private generateVerificationTemplate(input: { email: string }) {
    const { email } = input;
    const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>И-мэйл хаяг баталгаажуулах тухай</title>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
            body, h1, h2, h3, p, a, div {
              font-family: 'Montserrat', sans-serif;
            }
          </style>
          </head>
              <div style="display:none; max-height:0px; overflow:hidden; mso-hide:all; font-size:1px; color:#ffffff; line-height:1px;">
Таны Hire.mn платформын бүртгэл хийгдэж байна. Линк дээр дарж и-мэйл хаягаа баталгаажуулна уу.    ​
</div>
          <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
            <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
              <div style="max-width: 600px; margin: 0 auto;">
                <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                <td>
                
                <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width: 80%; text-align: left; vertical-align: middle;">
            <img src="https://raw.githubusercontent.com/usukhbaya12/images/refs/heads/main/hire-2-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
            </td>
      <td style="width: 20%; text-align: right; vertical-align: middle;">
              <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
                <tr>
                  <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
                    <a href="${process.env.WEB || 'https://hire.mn'}" 
                      style="padding: 10px 16px; border-radius: 4px; 
                              color: #ff5000 !important; 
                              font-family: 'Montserrat', Arial, sans-serif; 
                              font-size: 14px; font-weight: 600; 
                              text-decoration: none; 
                              display: inline-block;
                              mso-line-height-rule: exactly;
                              line-height: 1.2;
                              text-align: center;">
                      Зочлох
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
                      </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                            Өдрийн мэнд,
                          </td>
                           <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
Таны онлайн тест, үнэлгээний Hire.mn платформын бүртгэл хийгдэж байна. Та <a style="color: #ff5000; text-decoration: none;" href=https://srv666826.hstgr.cloud/api/v1/user/email/confirm/${email}>энд дарж</a> өөрийн и-мэйл хаягаа баталгаажуулна уу.                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Хэрвээ танд бүртгэлтэй холбоотой асууж тодруулах зүйл байвал ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> мэйл хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              Хүндэтгэсэн,<br/>Hire.mn
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                      <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
                    </td>
                  </tr>
                </table>
                
                </td>
                </tr>
                </table>
              </div>
            </center>
          </body>
          </html>
          `;
    return { html };
  }

  private generateOtpTemplate(input: { code: string }) {
    const { code } = input;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Нууц үг сэргээх тухай</title>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
      body, h1, h2, h3, p, a, div {
        font-family: 'Montserrat', sans-serif;
      }
    </style>
    </head>
    <div style="display:none; max-height:0px; overflow:hidden; mso-hide:all; font-size:1px; color:#ffffff; line-height:1px;">
${code} / Таны Hire.mn дээрх бүртгэлтэй хаягийн нууц үг сэргээх баталгаажуулах кодыг илгээлээ.    ​
</div>
    <body style="margin: 0; padding: 0; min-width: 100%; margin-top: 10px; font-family: 'Montserrat', sans-serif;">
      <center style="width: 100%; table-layout: fixed; padding-bottom: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <table width="600" cellspacing="0" cellpadding="0" border="0" align="center">
          <tr>
          <td>
          
          <table align="center" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; background-color: #ffffff; margin: 0 auto; border-spacing: 0; border-collapse: collapse;">
            <tr>
              <td style="background: linear-gradient(135deg, #ff5000 0%, #ed1c45 100%); padding: 20px 40px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width: 80%; text-align: left; vertical-align: middle;">
            <img src="https://raw.githubusercontent.com/usukhbaya12/images/refs/heads/main/hire-2-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
      </td>
<td style="width: 20%; text-align: right; vertical-align: middle;">
        <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
          <tr>
            <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
              <a href="${process.env.WEB || 'https://hire.mn'}" 
                style="padding: 10px 16px; border-radius: 4px; 
                        color: #ff5000 !important; 
                        font-family: 'Montserrat', Arial, sans-serif; 
                        font-size: 14px; font-weight: 600; 
                        text-decoration: none; 
                        display: inline-block;
                        mso-line-height-rule: exactly;
                        line-height: 1.2;
                        text-align: center;">
                Зочлох
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
                </td>
            </tr>
            
            <tr>
              <td style="background-color:rgb(250, 250, 250); padding: 20px 40px 10px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; color: #333333;">
                      Өдрийн мэнд,
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 20px 0;">
                      <div style="font-family: 'Montserrat', sans-serif; font-size: 36px; font-weight: bold; color: #ff5000; padding: 15px 25px; background-color: #fff9e6; display: inline-block; letter-spacing: 5px; border-radius: 99px">
                        ${code}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                      <p style="margin: 0 0 15px 0;">
                        Таны Hire.mn дээрх бүртгэлтэй хаягийн нууц үг сэргээх кодыг илгээлээ. Хэрвээ та нууц үг сэргээх хүсэлт илгээгүй бол ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> мэйл аягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                      <p style="margin: 0 0 15px 0;">
                        Хүндэтгэсэн,<br/>Hire.mn
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <tr>
              <td style="background-color: #f5f5f5; padding: 20px; text-align: center; font-family: 'Montserrat', sans-serif; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; line-height: 1.5;">Шуудангийн хаяг: Аксиом Инк ХХК, Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо<br>Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p><br/>
                <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} Аксиом Инк.</p>
              </td>
            </tr>
          </table>
          
          </td>
          </tr>
          </table>
        </div>
      </center>
    </body>
    </html>
    `;
    return { html };
  }
}
