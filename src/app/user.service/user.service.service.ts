import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { generateQrWithLogo } from 'src/utils/qr.util';
import {
  CreateExamServiceDto,
  CreateUserServiceDto,
  SendLinkToEmail,
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
  AssessmentAudience,
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
    const role = +user['role'];
    if (assessment.audience == AssessmentAudience.ORGANIZATION) {
      if (role == Role.organization) {
        if (assessment?.owner?.id != user['id'])
          throw new HttpException(
            'Тест авах эрхгүй байна.',
            HttpStatus.BAD_REQUEST,
          );
      } else {
        throw new HttpException(
          'Тестийг зөвхөн урилгаар авна.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
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
    if (+user['role'] == Role.organization) {
      // Байгуулллага wallet-аар шууд төлдөг — QPay invoice шаардлагагүй
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
      // Wallet-аар шууд төлсөн тул status-ийг SUCCESS болгоно
      if (price > 0) {
        await this.dao.updateStatus(res.id, PaymentStatus.SUCCESS);
      }
    } else if (price > 0) {
      // Байгуулллага биш хэрэглэгч QPay-аар төлнө
      invoice = await this.qpay.createInvoice(price, res.id, +user['id']);
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

  private normalizeSortDir(sortDir?: string): 'ASC' | 'DESC' {
    return `${sortDir ?? 'DESC'}`.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  }

  private sortExamLikeItems<T extends Record<string, any>>(
    items: T[],
    sortBy?: string,
    sortDir?: string,
  ) {
    const direction = this.normalizeSortDir(sortDir) === 'ASC' ? 1 : -1;
    const getValue = (item: T) => {
      switch (sortBy) {
        case 'assessmentName':
          return `${item.assessment?.name ?? item.assessmentName ?? ''}`.toLowerCase();
        case 'endDate':
          return new Date(item.endDate ?? 0).getTime();
        case 'startDate':
          return new Date(item.startDate ?? 0).getTime();
        case 'userStartDate':
          return new Date(item.userStartDate ?? 0).getTime();
        case 'userEndDate':
          return new Date(item.userEndDate ?? 0).getTime();
        case 'createdAt':
        default:
          return new Date(item.createdAt ?? 0).getTime();
      }
    };

    return [...items].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);

      if (left === right) {
        return 0;
      }

      return left > right ? direction : -direction;
    });
  }

  private async getResultMap(codes: string[]) {
    return new Map(
      (await this.result.findByCodes(codes)).map((item) => [item.code, item]),
    );
  }

  public async findByUser(
    assId: number,
    id: number,
    email: string,
    pg: PaginationDto,
    status?: number,
    examStatus?: string,
  ) {
    const {
      data: ownedServices,
      count,
      total,
    } = await this.dao.findByUser(assId, id, 0, pg, status, examStatus);

    const ownedExamCodes = new Set<string>();
    for (const service of ownedServices) {
      for (const exam of service.exams ?? []) {
        if (exam.code) {
          ownedExamCodes.add(exam.code);
        }
      }
    }

    const resultMap = await this.getResultMap([...ownedExamCodes]);

    const data = ownedServices.map((service) => {
      const { exams, user, ...body } = service;

      return {
        ...body,
        user,
        exams: (exams ?? []).map((exam) => ({
          ...exam,
          result: resultMap.get(exam.code) ?? null,
        })),
      };
    });

    return {
      data,
      count,
      total,
      page: pg?.page ?? 1,
      limit: pg?.limit ?? 20,
      totalPages: Math.ceil(total / (pg?.limit ?? 20)),
      sortBy: pg?.sortBy,
      sortDir: pg?.sortDir,
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

  public async findInvitedByUser(
    assId: number,
    id: number,
    email: string,
    pg: PaginationDto,
    examStatus?: string,
  ) {
    const { data, count, total, page, limit, sortBy, sortDir } =
      await this.examDao.findInvitedByUser(id, email, assId, pg, examStatus);
    const resultMap = await this.getResultMap(data.map((item) => item.code));

    return {
      data: this.sortExamLikeItems(
        data.map((item) => ({
          ...item,
          result: resultMap.get(item.code) ?? null,
        })),
        sortBy,
        sortDir,
      ),
      count,
      total,
      page,
      limit,
      sortBy,
      sortDir,
    };
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
    const links = dto.links || [];
    if (links.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    // Bounded concurrency to avoid bursting DB / Resend when many invites
    // are submitted in quick succession (e.g. 50 x 3 batches).
    const CONCURRENCY = 3;

    const processOne = async (email: SendLinkToEmail) => {
      await this.examService.updateExamByCode(email.code, {
        email: email.email,
        firstname: email.firstname,
        lastname: email.lastname,
        phone: email.phone,
        visible: email.visible,
      });

      const existingUser = await this.userDao.findByEmail(email.email);
      const isNewUser = !existingUser;
      let generatedPassword = '';
      if (isNewUser) {
        generatedPassword = generatePassword();
        const password = await bcrypt.hash(generatedPassword, saltOrRounds);
        try {
          await this.userDao.add({
            email: email.email,
            firstname: email.firstname,
            lastname: email.lastname,
            role: Role.client,
            wallet: 0,
            password,
          });
        } catch (err) {
          // Likely a race with a concurrent invite for the same email —
          // ignore unique-violation and treat as existing user.
          // eslint-disable-next-line no-console
          console.warn(
            `userDao.add race for ${email.email}: ${err?.message || err}`,
          );
        }
      }

      if (dto.noEmail) return;

      const exam = await this.examDao.findByCode(email.code);
      const date = new Date(exam.endDate);
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const year = `${date.getFullYear()}`;
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hour = pad(date.getHours());
      const minute = pad(date.getMinutes());

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
        isNewUser,
        lastname: email.lastname,
        phone: email.phone,
        visible: email.visible,
        orgName: exam.service.user?.organizationName,
        password: generatedPassword,
      });
    };

    let cursor = 0;
    let processed = 0;
    let failed = 0;
    const failures: { email: string; error: string }[] = [];

    const worker = async () => {
      while (cursor < links.length) {
        const idx = cursor++;
        const link = links[idx];
        try {
          await processOne(link);
          processed++;
        } catch (err: any) {
          failed++;
          failures.push({
            email: link?.email,
            error: err?.message?.slice(0, 500) || 'unknown',
          });
          // eslint-disable-next-line no-console
          console.error(`sendLinkToMail failed for ${link?.email}:`, err);
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, links.length) },
      () => worker(),
    );
    await Promise.all(workers);

    return {
      success: failed === 0,
      processed,
      failed,
      failures: failures.length ? failures : undefined,
    };
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

  /**
   * Байгууллагын үйлчилгээнд зориулсан public QR + print metadata үүсгэнэ.
   * QR → ${WEB_URL}/exam/public/${serviceId}  (бүртгэлгүй оролцогч)
   * Hire лого QR-ийн голд байрлана.
   */
  public async generatePublicQr(serviceId: number, requesterId: number) {
    const service = await this.dao.findOne(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }

    const base = (process.env.WEB ?? 'https://hire.mn').replace(/\/$/, '');
    const url = `${base}/exam/public/${serviceId}`;

    const qrDataUrl = await generateQrWithLogo(url);

    const assessmentName = service.assessment?.name ?? '';
    const orgName =
      service.user?.organizationName ?? service.user?.firstname ?? '';
    const showResultOnComplete =
      (service.assessment as any)?.showResultOnComplete ?? false;

    return {
      qr: qrDataUrl,
      url,
      assessmentName,
      orgName,
      showResultOnComplete,
    };
  }

  /**
   * Public QR уншаад ирсэн хүний мэдээллийг авч, тухайн service дотор
   * шинэ exam үүсгэнэ. Эхлүүлэх token-ийг буцаана.
   */
  public async createPublicExam(
    serviceId: number,
    dto: {
      firstname: string;
      lastname: string;
      email?: string;
      phone?: string;
    },
  ) {
    const service = await this.dao.findOne(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }

    const email = dto.email?.trim() ? dto.email.trim().toLowerCase() : null;
    const phone = dto.phone?.trim() || null;

    // И-мэйл заавал биш, гэхдээ бичсэн бол зөв форматтай байх ёстой
    // (production дээр "@" дутуу и-мэйл давхар бичлэг үүсгэсэн тохиолдол
    // ажиглагдсан).
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpException(
        'И-мэйл хаяг буруу форматтай байна.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Ижил email/phone-тэй хүн энэ QR (service) дээр сүүлийн 24 цагийн
    // дотор аль хэдийн бүртгүүлсэн бол ШИНЭ exam үүсгэхгүй (quota дахин
    // зарцуулахгүй, давхар мөр үүсгэхгүй) — байгаа кодыг нь буцаана.
    // /exam/:code хуудас руу орохдоо updateByCode нь category===undefined
    // үед forceLogin-ийг заавал (дахин) хийдэг тул тухайн хүн шууд өөрийн
    // эрхээр нэвтэрнэ ("бүртгэлтэй бол force login").
    const existing = await this.examDao.findByServiceAndContact(
      serviceId,
      email,
      phone,
    );
    if (existing) {
      return { code: existing.code };
    }

    if (service.count - service.usedUserCount <= 0 && service.price != 0) {
      throw new HttpException(
        'Тестийн эрх дууссан байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const examCode = await this.examService.create(
      {
        service: serviceId,
        assessment: service.assessment,
        endDate: null,
        startDate: null,
        created: service.user?.id,
      },
      null,
    );

    // Оролцогчийн мэдээллийг хадгалах
    await this.examDao.update(examCode, {
      firstname: dto.firstname,
      lastname: dto.lastname,
      email,
      phone,
    });

    await this.updateCount(serviceId, 0, 1, service.user?.id);

    return { code: examCode };
  }

  public async getPublicServiceInfo(serviceId: number) {
    const service = await this.dao.findOne(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    return {
      assessmentName: service.assessment?.name ?? '',
      orgName: service.user?.organizationName ?? service.user?.firstname ?? '',
    };
  }
}
