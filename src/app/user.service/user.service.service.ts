import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
  SendLinkToEmail,
  SendLinkToEmails,
} from './dto/create-user.service.dto';
import {
  UpdateDateDto,
  UpdateUserServiceDto,
} from './dto/update-user.service.dto';
import { UserServiceDao } from './user.service.dao';
import { BaseService } from 'src/base/base.service';
import { PaymentService } from '../payment/payment.service';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { ExamService } from '../exam/exam.service';
import { UserDao } from '../user/user.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { MailerService } from '@nestjs-modules/mailer';
import { QpayService } from '../payment/qpay.service';
import { PaymentStatus, PaymentType } from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';
import { PaymentDao } from '../payment/dao/payment.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { ResultDao } from '../exam/dao/result.dao';
import { BarimtService } from '../barimt/barimt.service';

@Injectable()
export class UserServiceService extends BaseService {
  constructor(
    private dao: UserServiceDao,
    private transactionDao: TransactionDao,
    private paymentDao: PaymentDao,
    private examService: ExamService,
    private examDao: ExamDao,
    private userDao: UserDao,
    private assessmentDao: AssessmentDao,
    private mailer: MailerService,
    private qpay: QpayService,
    private result: ResultDao,
    private barimt: BarimtService,
  ) {
    super();
  }
  public async create(dto: CreateUserServiceDto, user: any) {
    const assessment = await this.assessmentDao.findOne(dto.assessment);
    const price = assessment.price * dto.count;
    if (
      +user['role'] == Role.organization &&
      parseFloat(user['wallet']) - price < 0
    )
      throw new HttpException(
        'Үлдэгдэл хүрэлцэхгүй байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    const res = await this.dao.create(
      { ...dto, usedUserCount: 0, user: user['id'] },
      price,
    );
    let invoice = null;
    if (price > 0) {
      invoice = await this.qpay.createPayment(
        price,
        res.id.toString(),
        user['id'],
      );
    }
    if (+user['role'] == Role.organization) {
      await this.transactionDao.create(
        {
          price: assessment.price,
          assesmentName: assessment.name,
          assessment: assessment.id,
          count: dto.count,
          service: res.id,
          user: +user['id'],
        },
        2,
      );
      await this.userDao.updateWallet(user['id'], -price);
    }
    return {
      data: res,
      invoice,
    };
  }
  public async getEbarimt(id: number, email: string) {
    await this.barimt.getBarimt(id, email);
  }
  public async checkPayment(id: number, code: string, user: number) {
    const payment = await this.qpay.checkPayment(code);
    if (payment.paid_amount) {
      const service = await this.dao.updateStatus(id, PaymentStatus.SUCCESS);
      await this.paymentDao.create({
        method: PaymentType.QPAY,
        totalPrice: payment.paid_amount,
        user: user,
        message: 'Худалдан авалт хийсэн.',
        assessment: service.assessment.id,
      });
      await this.transactionDao.create(
        {
          assessment: service.assessment.id,
          price: payment.paid_amount,
          count: -1,
          service: service.id,
          user: user,
        },
        2,
      );
      // const barimt = this.barimt.restReceipt(
      //   {
      //     billIdSuffix: service.id.toString(),
      //     reportMonth: null,
      //     receipts: [
      //       {
      //         items: [
      //           {
      //             name: service.assessment.name,
      //             qty: service.count,
      //             unitPrice: service.assessment.price,
      //             totalCityTax: 2,
      //             totalVAT: 10,
      //           },
      //         ],
      //       },
      //     ],
      //     payments: [
      //       {
      //         code: 'BANK_TRANSFER',
      //         status: 'PAID',
      //         paidAmount: payment.paid_amount,
      //       },
      //     ],
      //   },
      //   service.user,
      //   payment.paid_amount,
      //   service.id,
      // );

      return true;
    }
    return false;
  }

  // public async

  public async findByUser(assId: number, id: number, email: string) {
    const responses = await this.dao.findByUser(assId, id, 0);
    const res = [];
    const ex = [];
    const data = await this.examDao.findByUser([], email, assId);
    for (const response of responses) {
      const { exams, user, ...body } = response;
      const examResults = [];
      for (const exam of exams) {
        const result = await this.result.findOne(exam.code);
        examResults.push({
          ...exam,
          result: result,
        });
        ex.push(exam);
      }

      res.push({ ...body, user, exams: examResults });
    }
    const filtered = data.filter(
      (obj1) => !ex.some((obj2) => obj2.code === obj1.code),
    );

    const invited = await Promise.all(
      filtered.map(async (f) => {
        const result = await this.result.findOne(f.code);
        return {
          ...f,
          result,
        };
      }),
    );

    return {
      data: res,
      invited,
    };
    // const exams = await this.examDao.findAll(assId, email);
    // const res = [];
    // for (const exam of exams) {
    //   const result = await this.result.findOne(exam.code);
    //   const service = await this.dao.findByUser(assId, id, exam.service.id);
    //   res.push({
    //     ...exam,
    //     result: result,
    //     invited: service.length == 0,
    //   });
    // }
    // return res;
  }

  public async createExam(dto: CreateExamServiceDto, id: number, role: number) {
    const service = await this.dao.findOne(dto.service);
    if (!service)
      throw new HttpException(
        'Худалдан авалт олдсонгүй',
        HttpStatus.BAD_REQUEST,
      );
    if (
      role == Role.organization &&
      service.count - service.usedUserCount - dto.count < 0
    )
      throw new HttpException(
        'Үлдэгдэл хүрэлцэхгүй байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    const code = Promise.all(
      Array.from({ length: dto.count }, (_, i) => i + 1).map(async (i) => {
        const res = await this.examService.create(
          {
            endDate: dto.endDate,
            service: dto.service,
            created: service.user?.id,
            startDate: dto.startDate,
            assessment: service.assessment,
          },
          service.user
            ? service.user.role == Role.client
              ? service.user
              : null
            : null,
        );
        return res;
      }),
    );
    // if (role == Role.organization)
    await this.updateCount(dto.service, 0, dto.count, id);

    return code;
  }
  public async sendLinkToMail(dto: SendLinkToEmails) {
    try {
      Promise.all(
        dto.links.map(async (email) => {
          await this.examService.updateExamByCode(email.code, {
            email: email.email,
            firstname: email.firstname,
            lastname: email.lastname,
            phone: email.phone,
            visible: email.visible,
          });
          const exam = await this.examDao.findByCode(email.code)
          const date = new Date(exam.endDate)
          const year = date.getFullYear()
          let month =  `${date.getMonth() + 1}`
          if(+month < 10) month = `0${month}`
          let day = `${date.getDate()}`
          if(+day < 10) day = `0${day}`
          let hour = `${date.getHours()}`
          if(+hour < 10) hour = `0${hour}`
          let minute = `${date.getMinutes()}`
          if(+minute < 10) minute = `0${minute}`
          let second = `${date.getSeconds()}`
          if(+second < 10) second = `0${second}`
          console.log(exam.service)
          await this.mailer.sendMail({
            to: email.email,
            subject: 'Танд тестийн урилга ирлээ',
            html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Танд тестийн урилга ирлээ</title>
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
                        <img src="https://hire.mn/hire-all-white.png" alt="Hire.mn Logo" width="120" height="auto" style="display: block; border: 0;">
              </td>
        <td style="width: 20%; text-align: right; vertical-align: middle;">
                <table cellspacing="0" cellpadding="0" border="0" align="right" style="display: inline-block;">
                  <tr>
                    <td style="border-radius: 99px; background: linear-gradient(135deg, #ffffff 20%, #ffffff 21%); mso-padding-alt: 10px 16px; text-align: center;">
                      <a href="https://hire.mn" 
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
                                <br/>Эрхэм <strong>${email.lastname} ${email.firstname}</strong> танд <strong>${exam.service.user?.organizationName ?? ''}</strong> байгууллагаас <strong style="color: #ff5000;">${exam?.service?.assessment?.name}</strong> онлайн тест, үнэлгээнд оролцох урилга илгээсэн байна. Та <a style="color: #ff5000; text-decoration: none;" href=https://hire.mn/exam/${email.code}>линк дээр дарж</a> тест, үнэлгээндээ оролцоно уу.
                            </td>
                          </tr>
                           <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <br/>Тест, үнэлгээний линк ${year} оны ${month} сарын ${date} өдрийн ${hour} цаг хүртэл хүчинтэй ажиллахыг анхаарна уу. Танд амжилт хүсье.</p>
                            </td>
                          </tr>
                          <tr>
                          <td style="font-family: 'Montserrat', sans-serif; font-size: 14px; line-height: 1.6; color: #333333; text-align: justify;">
                            <p style="margin: 0 0 15px 0;">
                              <br/>Тест, үнэлгээтэй холбоотой асууж тодруулах зүйл гарвал ажлын өдрүүдэд 09-18 цагийн хооронд <a href="mailto:info@hire.mn" style="color: #ff5000; text-decoration: none;">info@hire.mn</a> хаягаар эсвэл <a href="tel:976-9909 9371" style="color: #ff5000; text-decoration: none;">976-9909 9371</a> утсаар холбогдоно уу.
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
            `,
          });
        }),
      );
    } catch (error) {
      console.log(error);
    }
  }
  public async updateCount(
    service: number,
    count: number,
    used: number,
    user: number,
  ) {
    await this.dao.updateCount(service, count, used);
  }

  public async findExam(service: number) {
    return await this.examService.findExamByService(service);
  }

  public async findAll() {
    return await this.dao.findAll();
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }

  remove(id: number) {
    return `This action removes a #${id} userService`;
  }
}
