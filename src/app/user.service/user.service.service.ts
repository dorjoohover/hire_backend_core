import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
  SendLinkToEmails,
} from './dto/create-user.service.dto';
import { UserServiceDao } from './user.service.dao';
import { BaseService } from 'src/base/base.service';
import { TransactionDao } from '../payment/dao/transaction.dao';
import { ExamService } from '../exam/exam.service';
import { UserDao } from '../user/user.dao';
import { AssessmentDao } from '../assessment/dao/assessment.dao';
import { QpayService } from '../payment/qpay.service';
import {
  generatePassword,
  PaymentStatus,
  PaymentType,
} from 'src/base/constants';
import { Role } from 'src/auth/guards/role/role.enum';
import { PaymentDao } from '../payment/dao/payment.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { ResultDao } from '../exam/dao/result.dao';
import { BarimtService } from '../barimt/barimt.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import * as bcrypt from 'bcryptjs';
import { saltOrRounds } from '../user/user.service';
import { EmailService } from '../email/email.service';
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
    @Inject(forwardRef(() => EmailService))
    private mailer: EmailService,
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
      invoice = await this.qpay.createInvoice(price, res.id, +user['id']);
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
    return await this.barimt.getBarimt(id, email);
  }
  public async deleteEbarimt(id: number) {
    return await this.barimt.deleteReceipt(id);
  }

  public async updateStatus(user: number, amount: number, id: number) {
    const res = await this.dao.findOne(id);
    if (res.status == PaymentStatus.SUCCESS) return;
    const service = await this.dao.updateStatus(id, PaymentStatus.SUCCESS);
    await this.paymentDao.create({
      method: PaymentType.QPAY,
      totalPrice: amount,
      user: user,
      message: `Худалдан авалт хийсэн.-${service.id}`,
      assessment: service.assessment.id,
    });
    await this.transactionDao.create(
      {
        assessment: service.assessment.id,
        price: amount,
        count: -1,
        service: service.id,
        user: user,
      },
      2,
    );
    if (service.assessment.price && service.assessment.price > 0) {
      await this.barimt.restReceipt(
        {
          billIdSuffix: service.id.toString(),
          reportMonth: null,
          receipts: [
            {
              items: [
                {
                  name: service.assessment.name,
                  qty: service.count,
                  unitPrice: service.assessment.price,
                  totalCityTax: 2,
                  totalVAT: 10,
                  classificationCode: service.assessment.classificationCode,
                },
              ],
            },
          ],
          payments: [
            {
              code: 'BANK_TRANSFER',
              status: 'PAID',
              paidAmount: amount,
              data: {
                easy: true,
              },
            },
          ],
        },
        service.user,
        amount,
        service.id,
      );
    }
  }

  public async checkCallback(user: number, id: string, invoice: number) {
    const res = await this.qpay.getInvoice(id);

    if (res.status === 'PAID') {
      const service = await this.dao.findOne(invoice);
      await this.updateStatus(user, +res.amount, invoice);
      await this.getEbarimt(service.id, service.user.email);
    }
  }
  public async checkPayment(
    id: number,
    code: string,
    user: number,
    email: string,
  ) {
    const payment = code == 'NONE' ? 1 : await this.qpay.checkPayment(code);
    if (payment == 1) {
      return await this.getEbarimt(id, email);
    }
    if (payment.paid_amount) {
      await this.updateStatus(user, payment.paid_amount, id);
      return true;
    }
    return false;
  }

  // public async

  public async findByUser(assId: number, id: number, email: string) {
    const { data, count, total } = await this.dao.findByUser(assId, id, 0);
    const res = [];
    const ex = [];
    const exam = await this.examDao.findByUser([], email, assId);
    for (const response of data) {
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
    const filtered = exam.filter(
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
      count: res.length,
      total,
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
    console.log(service.count, service.usedUserCount, dto.count);
    if (service.count - service.usedUserCount - dto.count < 0)
      throw new HttpException(
        'Үлдэгдэл хүрэлцэхгүй байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );

    const code = await Promise.all(
      Array.from({ length: dto.count }, (_, i) => i + 1).map(async (i) => {
        console.log(service.user, role);
        const res = await this.examService.create(
          {
            endDate: dto.endDate,
            service: dto.service,
            created: service.user?.id,
            startDate: dto.startDate,
            assessment: service.assessment,
          },
          service.user ? (role == Role.client ? service.user : null) : null,
        );
        return res;
      }),
    );
    // if (role == Role.organization)
    await this.updateCount(dto.service, 0, dto.count, id);

    return code;
  }
  public async sendLinkToMail(dto: SendLinkToEmails, id?: number) {
    Promise.all(
      dto.links.map(async (email) => {
        await this.examService.updateExamByCode(email.code, {
          email: email.email,
          firstname: email.firstname,
          lastname: email.lastname,
          phone: email.phone,
          visible: email.visible,
        });

        // Check if user exists in database
        const existingUser = await this.userDao.findByEmail(email.email);
        const isNewUser = !existingUser;
        let password;
        let generatedPassword = '';
        if (isNewUser) {
          generatedPassword = generatePassword();
          password = await bcrypt.hash(generatedPassword, saltOrRounds);
          await this.userDao.add({
            email: email.email,
            firstname: email.firstname,
            lastname: email.lastname,
            role: Role.client,
            wallet: 0,
            password,
          });
        }
        const exam = await this.examDao.findByCode(email.code);
        const date = new Date(exam.endDate);
        const year = `${date.getFullYear()}`;
        let month = `${date.getMonth() + 1}`;
        if (+month < 10) month = `0${month}`;
        let day = `${date.getDate()}`;
        if (+day < 10) day = `0${day}`;
        let hour = `${date.getHours()}`;
        if (+hour < 10) hour = `0${hour}`;
        let minute = `${date.getMinutes()}`;
        if (+minute < 10) minute = `0${minute}`;
        let second = `${date.getSeconds()}`;
        if (+second < 10) second = `0${second}`;

        await this.mailer.sendInvitation({
          assessment: exam.assessment,
          code: `${email.code}`,
          day,
          month,
          year,
          minute,
          hour,
          firstname: email.firstname,
          id,
          email: email.email,
          isNewUser: isNewUser,
          lastname: email.lastname,
          phone: email.phone,
          visible: email.visible,
          orgName: exam.service.user?.organizationName,
          password: generatedPassword,
        });
      }),
    );
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

  public async findAll(pg: PaginationDto) {
    return await this.dao.findAll(pg);
  }

  public async findOne(id: number) {
    return await this.dao.findOne(id);
  }
}
