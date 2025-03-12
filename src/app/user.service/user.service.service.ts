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
    if (+user['role'] == Role.organization)
      await this.userDao.updateWallet(user['id'], -price);
    return {
      data: res,
      invoice,
    };
  }

  public async checkPayment(id: number, code: string, user: number) {
    const payment = await this.qpay.checkPayment(code);
    if (payment.paid_amount) {
      await this.dao.updateStatus(id, PaymentStatus.SUCCESS);
      const res = await this.paymentDao.create({
        method: PaymentType.QPAY,
        totalPrice: payment.paid_amount,
        user: user,
        message: 'Худалдан авалт хийсэн.',
      });
      await this.transactionDao.create({
        price: payment.paid_amount,
        count: -1,
        payment: res,
        service: id,
        user: user,
      });
      return true;
    }
    return false;
  }

  // public async

  public async findByUser(assId: number, email: string, id: number) {
    const exams = await this.examDao.findAll(assId, email);
    const res = [];
    for (const exam of exams) {
      const result = await this.result.findOne(exam.code);
      const service = await this.dao.findByUser(assId, id, exam.service.id);
      res.push({
        ...exam,
        result: result,
        invited: service.length == 0,
      });
    }
    return res;
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
        console.log(dto.service);
        const res = await this.examService.create({
          endDate: dto.endDate,
          service: dto.service,
          created: service.user?.id,
          startDate: dto.startDate,
          assessment: service.assessment,
        });
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
          await this.mailer
            .sendMail({
              to: email.email,
              subject: 'Тест өгөх эрх үүсэх',
              html: `<div>
         <p> Та <a href=https://hire.mn/exam/${email.code}>линк</a> дээр дарж тестээ бөглөнө үү.</p>
<p>Таны анхааралд:</p>
<ul>
        <li>Танд hire.mn цахим хуудас дээрх ... тест өгөх эрх үүссэн байна.</li>
<li>Тест эхлэхийн өмнө дэлгэцэд гарах зааврыг хянамгай уншихыг хүсье.</li>
</ul>
          <p>Асууж, тодруулах зүйл байвал <a href=mailto:info@hire.mn>info@hire.mn</a> хаягаар, <a href=tel:976-9909 9371>976-9909 9371</a> дугаараар холбогдоорой. </p>
          <p>Манайхаар үйлчлүүлж байгаад тань баярлалаа.</p>
          <p>Шуудангийн хаяг: Улаанбаатар хот, Баянзүрх дүүрэг, 1-р хороо Энхтайвны өргөн чөлөө-5, СЭЗИС, Б байр, 7-р давхар, 13381, Ш/Н: Улаанбаатар-49</p>
          </div>`,
            })
            .then((d) => console.log(d))
            .finally(() => console.log('sent'))
            .catch((err) => console.log(err));
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
    const res = await this.dao.findOne(service);
    await this.transactionDao.create({
      user: user,
      count: count == 0 ? -used : count,
      price: res.price ?? 0,
      service: service,
    });
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

  public async update(id: number, dto: UpdateDateDto) {
    const res = await this.dao.findOne(id);
    const exams = res.exams;
    for (const exam of exams) {
      await this.examDao.updateDate(exam.id, dto);
    }
  }

  remove(id: number) {
    return `This action removes a #${id} userService`;
  }
}
