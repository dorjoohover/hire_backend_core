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
  AssessmentStatus,
  generatePassword,
  PaymentStatus,
  PaymentType,
} from 'src/base/constants';
import { Admins, Role } from 'src/auth/guards/role/role.enum';
import { UserServiceEntity } from './entities/user.service.entity';
import { PaymentDao } from '../payment/dao/payment.dao';
import { ExamDao } from '../exam/dao/exam.dao';
import { ResultDao } from '../exam/dao/result.dao';
import { BarimtService } from '../barimt/barimt.service';
import { PaginationDto } from 'src/base/decorator/pagination';
import * as bcrypt from 'bcryptjs';
import { saltOrRounds } from '../user/user.service';
import { EmailService } from '../email/email.service';
import { AuthService } from 'src/auth/auth.service';
import { effectiveShowResult } from './show-result';
import {
  DEFAULT_SUBJECTS,
  DEFAULT_TEMPLATES,
  fillHtml,
  examLink,
  fillTemplate,
  MessageTemplates,
  sendSkytelSms,
  SMS_MAX,
  TEMPLATE_KEYS,
  renderSms,
} from './message-template';
import { MessageDraftDao } from './message-draft.dao';
import { MessageDraftEntity } from './entities/message-draft.entity';
import { ExamEntity } from '../exam/entities/exam.entity';
import {
  checkQrExpiry,
  parseQrExpiry,
  signQrExpiry,
} from 'src/utils/qr-expiry';
/** №8: нэг удаагийн "Эрх нэмэх"-ийн дээд хэмжээ (буруу оруулалт / хэтрэлтээс сэргийлнэ). */
export const MAX_TOPUP_COUNT = 1000;

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
    @Inject(forwardRef(() => AuthService))
    private authService: AuthService,
    private drafts: MessageDraftDao,
  ) {
    super();
  }
  public async create(dto: CreateUserServiceDto, user: any) {
    const assessment = await this.assessmentDao.findOne(dto.assessment);
    const role = +user['role'];
    // Admin-ийн "зөвхөн энэ байгууллагад" toggle нь status=ONLY + owner тавьдаг (audience-д хүрдэггүй).
    if (
      assessment.audience == AssessmentAudience.ORGANIZATION ||
      assessment.status == AssessmentStatus.ONLY
    ) {
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
    // ⚠️ count-ыг шалгахгүй байсан: сөрөг count → сөрөг үнэ → байгууллагын
    // wallet-д мөнгө НЭМЭГДЭЖ, 0 → үнэгүй SUCCESS болдог байв.
    const count = Number(dto.count);
    if (!Number.isInteger(count) || count < 1) {
      throw new HttpException(
        'Тестийн тоо буруу байна.',
        HttpStatus.BAD_REQUEST,
      );
    }
    dto.count = count;
    const price = assessment.price * dto.count;
    // №8: wallet-ийг JWT-д хадгалагдсан (хуучирсан байж болох) утгаар шалгаж, read-modify-write-аар
    // хасдаг байсан → зэрэг хүсэлтээр давхар зарцуулах боломжтой. Одоо DB-ээс АТОМАР хасна.
    let debited = false;
    if (+user['role'] == Role.organization && price > 0) {
      if (!(await this.userDao.debitWallet(+user['id'], price))) {
        throw new HttpException(
          'Үлдэгдэл хүрэлцэхгүй байна.',
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
      debited = true;
    }
    let res: UserServiceEntity;
    try {
      res = await this.dao.create(
        { ...dto, usedUserCount: 0, user: user['id'] },
        price,
      );
    } catch (error) {
      if (debited) await this.userDao.updateWallet(+user['id'], price);
      throw error;
    }
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
      // (wallet дээр `debitWallet`-ээр аль хэдийн хасагдсан)
      // Wallet-аар шууд төлсөн тул status-ийг SUCCESS болгоно
      if (price > 0) {
        await this.dao.updateStatus(res.id, PaymentStatus.SUCCESS);
      }
    } else if (price > 0) {
      // Байгуулллага биш хэрэглэгч QPay-аар төлнө
      invoice = await this.qpay.createInvoice(price, res.id, +user['id']);
      // Төлбөрийг зөвхөн энэ invoice-аар баталгаажуулахын тулд мөрөнд холбоно.
      if (invoice?.invoice_id) {
        await this.dao.setInvoiceId(res.id, `${invoice.invoice_id}`);
        res.qpayInvoiceId = `${invoice.invoice_id}`;
      }
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

  /**
   * Төлбөр баталгаажсаны дараах бүртгэл (payment, transaction, e-barimt).
   *
   * ⚠️ ЗӨВХӨН `dao.claimSuccess`-ээр PENDING → SUCCESS болгосон ганц дуудлагаас
   * дуудна — callback + polling зэрэг ирсэн ч давхар бүртгэл үүсэхгүй.
   * Хэрэглэгчийг URL-аас биш мөрийн эзэмшигчээс (`service.user`) авна.
   */
  private async recordPayment(service: UserServiceEntity, amount: number) {
    const user = service.user.id;
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

  /**
   * userService-ийн QPay төлбөрийг баталгаажуулж, төлөгдсөн бол SUCCESS болгоно.
   * Callback ба polling хоёул ЭНЭ нэг логикийг ашиглана. Идемпотент.
   *
   * ⚠️ Төлбөрийг мөрийн ӨӨРИЙН `qpayInvoiceId`-аар QPay-с асууна; URL / query-ээр
   * ирсэн өөр id-д итгэхгүй, төлсөн дүн `price`-аас бага бол нээхгүй.
   * Хуучин мөр (`qpayInvoiceId` = null, энэ засвараас өмнө үүссэн) зөвхөн
   * polling-оор, клиентийн өгсөн invoice-г ӨӨР мөрөнд холбогдоогүй бол
   * дүн шалгаад хүлээн авна (амжилттай бол тэр invoice-г мөрөнд холбоно).
   *
   * @returns 'settled' — одоо SUCCESS болголоо; 'already' — өмнө нь SUCCESS;
   *          'unpaid' — төлөгдөөгүй / дутуу төлсөн / төлөх боломжгүй.
   */
  private async confirmPending(
    service: UserServiceEntity,
    clientInvoiceId?: string,
  ): Promise<'settled' | 'already' | 'unpaid'> {
    if (service.status === PaymentStatus.SUCCESS) return 'already';
    if (service.status !== PaymentStatus.PENDING) return 'unpaid';

    let invoiceId = service.qpayInvoiceId;
    let bind = false;
    if (!invoiceId) {
      if (!clientInvoiceId) return 'unpaid';
      // Өөр мөрөнд аль хэдийн холбогдсон invoice-аар энэ мөрийг нээхгүй.
      if (await this.dao.findByInvoice(clientInvoiceId)) return 'unpaid';
      invoiceId = clientInvoiceId;
      bind = true;
    }

    const payment: any = await this.qpay.checkPayment(invoiceId);
    const paid = +(payment?.paid_amount ?? 0);
    // ⚠️ Дутуу төлбөрөөр нээхгүй (underpayment хамгаалалт).
    if (paid <= 0 || paid < service.price) return 'unpaid';

    const claimed = await this.dao.claimSuccess(
      service.id,
      bind ? invoiceId : undefined,
    );
    if (!claimed) return 'already'; // зэрэгцээ дуудлага аль хэдийн баталгаажуулсан
    await this.recordPayment(claimed, paid);
    return 'settled';
  }

  private assertServiceId(id: number) {
    // userService.id нь int4 — хэт том / буруу утга DB-д алдаа (500) өгөхөөс өмнө таслана.
    if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.NOT_FOUND);
    }
  }

  /**
   * QPay callback (нэвтрэлтгүй, public). `invoice` = userService.id.
   * URL-ийн `user`, `qpay_payment_id`-д итгэхгүй (зөвхөн лог): төлбөрийг мөрийн
   * өөрийн `qpayInvoiceId`-аар QPay-с дахин асууж баталгаажуулна.
   */
  public async checkCallback(
    _user: number,
    paymentId: string,
    invoice: number,
  ) {
    this.assertServiceId(invoice);
    const service = await this.dao.findForPayment(invoice);
    if (!service) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.NOT_FOUND);
    }

    // Хуучин мөр (invoice хадгалаагүй): callback-д итгэх баталгаа байхгүй —
    // polling (checkPayment) дуустал хүлээнэ.
    if (service.status === PaymentStatus.PENDING && !service.qpayInvoiceId) {
      console.log(
        `[userService] QPay callback #${service.id}: хуучин мөр (invoice-гүй), алгасав`,
      );
      return { paid: false };
    }

    const result = await this.confirmPending(service);
    const pid = `${paymentId ?? ''}`.replace(/[^\w-]/g, '').slice(0, 64);
    console.log(
      `[userService] QPay callback #${service.id} result=${result} payment=${pid}`,
    );
    if (result === 'settled') {
      try {
        await this.getEbarimt(service.id, service.user.email);
      } catch (e) {
        console.error('[userService] e-barimt илгээхэд алдаа:', e?.message);
      }
    }
    return { paid: result !== 'unpaid' };
  }

  /**
   * Нэвтэрсэн хэрэглэгчийн polling. `code` = QPay invoice_id (клиентээс) эсвэл
   * 'NONE' (төлбөргүй / wallet-аар төлсөн — зөвхөн e-barimt авна).
   * ⚠️ Зөвхөн тухайн userService-ийн эзэмшигч (эсвэл админ) шалгана.
   */
  public async checkPayment(
    id: number,
    code: string,
    user: number,
    email: string,
    role?: number,
  ) {
    this.assertServiceId(id);
    const service = await this.dao.findForPayment(id);
    const isAdmin = Admins.includes(+role as Role);
    if (!service || (!isAdmin && service.user?.id !== user)) {
      throw new HttpException('Нэхэмжлэх олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    if (code == 'NONE') {
      return await this.getEbarimt(id, email);
    }
    const result = await this.confirmPending(service, code);
    return result !== 'unpaid';
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
    const n = Number(dto.count);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpException('Тестийн тоо буруу байна.', HttpStatus.BAD_REQUEST);
    }
    // №8: шалгалт + нэмэлтийг АТОМАР захиална (зэрэг хүсэлтээр квотоос хэтрэхгүй).
    if (!(await this.dao.reserveSeats(dto.service, n, true))) {
      throw new HttpException(
        'Үлдэгдэл хүрэлцэхгүй байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const settled = await Promise.allSettled(
      Array.from({ length: n }, (_, i) => i + 1).map(async () => {
        return this.examService.create(
          {
            endDate: dto.endDate,
            service: dto.service,
            created: service.user?.id,
            startDate: dto.startDate,
            assessment: service.assessment,
          },
          service.user ? (role == Role.client ? service.user : null) : null,
        );
      }),
    );
    // Үүсээгүй exam-ийн суудлыг буцаана (үүссэн exam бүр суудал эзэлсэн хэвээр).
    const failed = settled.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      await this.dao.releaseSeats(dto.service, failed.length);
      throw (failed[0] as PromiseRejectedResult).reason;
    }
    const code = settled.map((r) => (r as PromiseFulfilledResult<any>).value);

    return code;
  }

  /** owner = дуудаж буй байгууллагын id; undefined = admin / дотоод дуудлага (шалгахгүй). */
  private async ownedExam(code: string, owner?: number) {
    const exam = await this.examDao.findByCode(code);
    if (!exam) throw new Error(`Код олдсонгүй: ${code}`);
    if (owner != null && exam.service?.user?.id !== owner)
      throw new Error(`Код танд хамаарахгүй: ${code}`);
    return exam;
  }

  /** Идэвхтэй драфтын текст, байхгүй бол default. */
  private draftBody(
    active: Record<string, MessageDraftEntity>,
    key: keyof MessageTemplates,
  ) {
    return active[key]?.body?.trim() ? active[key].body : DEFAULT_TEMPLATES[key];
  }

  /** Admin-ий идэвхтэй драфтууд; илгээгч өөр загвар сонгосон бол түүгээр солино. */
  private async chooseDrafts(
    kind: 'invite' | 'remind',
    pick: { emailDraft?: number; smsDraft?: number },
  ) {
    const drafts = await this.drafts.getActive();
    for (const [ch, id] of [
      ['Email', pick?.emailDraft],
      ['Sms', pick?.smsDraft],
    ] as const) {
      if (!id) continue;
      const d = Number.isInteger(+id) && (await this.drafts.findOne(+id));
      if (!d || d.type !== `${kind}${ch}`)
        throw new HttpException('Сонгосон загвар олдсонгүй.', HttpStatus.BAD_REQUEST);
      drafts[d.type] = d;
    }
    return drafts;
  }

  /** Урилга / сануулгыг мэйл ба/эсвэл SMS-ээр (байгууллагын драфтаар) илгээнэ. */
  private async notifyExam(
    exam: ExamEntity,
    kind: 'invite' | 'remind',
    opts: {
      email: boolean;
      sms: boolean;
      isNewUser?: boolean;
      password?: string;
      id?: number;
      drafts: Record<string, MessageDraftEntity>;
    },
  ) {
    const org = exam.service?.user;
    const active = opts.drafts;
    // Контейнер UTC байж болно → Улаанбаатарын цагаар ("2026-10-30 18:00:00").
    const [year, month, day, hour, minute] = exam.endDate
      ? new Date(exam.endDate)
          .toLocaleString('sv-SE', { timeZone: 'Asia/Ulaanbaatar' })
          .split(/[-\s:]/)
      : ['', '', '', '', ''];
    const vars = {
      lastname: exam.lastname ?? '',
      firstname: exam.firstname ?? '',
      // Хувь хэрэглэгч урьсан бол байгууллагын нэр байхгүй → нэрээр нь.
      org:
        org?.organizationName ||
        [org?.lastname, org?.firstname].filter(Boolean).join(' '),
      test: exam.assessment?.name ?? exam.assessmentName ?? '',
      deadline: exam.endDate ? `${year}.${month}.${day} ${hour}:${minute}` : '',
      link: examLink(exam.code),
    };

    if (opts.email && exam.email) {
      const remind = kind === 'remind';
      await this.mailer.sendInvitation({
        assessment: exam.assessment,
        code: `${exam.code}`,
        day,
        month,
        year,
        minute,
        hour,
        firstname: exam.firstname,
        id: opts.id,
        email: exam.email,
        isNewUser: !!opts.isNewUser,
        lastname: exam.lastname,
        phone: exam.phone,
        visible: exam.visible,
        orgName: org?.organizationName,
        password: opts.password,
        // Идэвхтэй урилгын драфтгүй бол анхны HTML текст хэвээр.
        body:
          remind || active.inviteEmail
            ? fillHtml(this.draftBody(active, `${kind}Email`), vars)
            : undefined,
        subject: fillTemplate(
          active[`${kind}Email`]?.subject || DEFAULT_SUBJECTS[kind],
          vars,
        ),
        action: remind ? 'sent reminder' : undefined,
      });
    }
    if (opts.sms && exam.phone) {
      await sendSkytelSms(
        exam.phone,
        renderSms(this.draftBody(active, `${kind}Sms`), vars),
      );
    }
  }

  // ── Admin "Мэйлийн загвар" ─────────────────────────────────────────────
  public async listDrafts() {
    return {
      drafts: await this.drafts.findAll(),
      defaults: DEFAULT_TEMPLATES,
      defaultSubjects: DEFAULT_SUBJECTS,
    };
  }

  /** Илгээх үед сонгох жагсаалт (бүх нэвтэрсэн хэрэглэгчид). */
  public async draftOptions() {
    return (await this.drafts.findAll()).map(({ id, name, type, active }) => ({
      id,
      name,
      type,
      active,
    }));
  }

  /** Хадгалсан загварыг (id-гүй бол үндсэн текстийг) жишээ утгаар харна. */
  public async previewSaved(type: string, id?: number) {
    const d = id ? await this.drafts.findOne(id) : null;
    if (id && !d) throw new HttpException('Загвар олдсонгүй.', HttpStatus.NOT_FOUND);
    return this.previewDraft(d ?? { type });
  }

  /** Урьдчилан харах / шалгахад хэрэглэх жишээ утгууд. */
  private sampleVars(org = 'Hire ХХК') {
    return {
      lastname: 'Бат',
      firstname: 'Болд',
      org,
      test: 'DISC зан төлөвийн тест',
      deadline: '2026.12.31 18:00',
      link: examLink('1'.repeat(17)),
    };
  }

  public async saveDraft(
    dto: { name?: string; type?: string; subject?: string; body?: string; active?: boolean },
    id?: number,
  ) {
    const bad = (m: string) => new HttpException(m, HttpStatus.BAD_REQUEST);
    const type = dto?.type as keyof MessageTemplates;
    if (!TEMPLATE_KEYS.includes(type)) throw bad('Загварын төрөл буруу байна.');
    const name = String(dto?.name ?? '').trim();
    if (!name || name.length > 120) throw bad('Загварын нэр оруулна уу (120 хүртэл тэмдэгт).');
    const body = dto?.body;
    if (typeof body !== 'string' || !body.replace(/<[^>]*>/g, '').trim() || body.length > 50000)
      throw bad('Мессежийн текст оруулна уу.');
    const isEmail = type.endsWith('Email');
    const subject = isEmail ? String(dto?.subject ?? '').trim() : '';
    if (subject.length > 255) throw bad('Гарчиг 255 тэмдэгтээс хэтэрч болохгүй.');
    if (!isEmail) {
      if (!body.includes('{link}'))
        throw bad('SMS драфтад тестийн холбоос {link} заавал байх ёстой.');
      // ~30 тэмдэгт байгууллагын нэрээр шалгана ({test} тайрагдана).
      const len = renderSms(body, this.sampleVars('x'.repeat(30))).length;
      if (len > SMS_MAX)
        throw bad(
          `SMS драфт хувьсагч орлуулсны дараа ~${len} тэмдэгт болж байна (${SMS_MAX} хүртэл). Богиносгоно уу.`,
        );
    }
    if (id && !(await this.drafts.findOne(id)))
      throw new HttpException('Загвар олдсонгүй.', HttpStatus.NOT_FOUND);
    return this.drafts.save({
      ...(id ? { id } : {}),
      name,
      type,
      subject: subject || null,
      body,
      active: !!dto.active,
    });
  }

  public async deleteDraft(id: number) {
    await this.drafts.delete(id);
    return true;
  }

  /** Жишээ утгаар бөглөсөн мэйлийн HTML / SMS текст (илгээхгүй). */
  public async previewDraft(dto: { type?: string; subject?: string; body?: string }) {
    const type = TEMPLATE_KEYS.includes(dto?.type as any)
      ? (dto.type as keyof MessageTemplates)
      : 'inviteEmail';
    const vars = this.sampleVars();
    const body = typeof dto?.body === 'string' && dto.body.trim() ? dto.body : DEFAULT_TEMPLATES[type];
    if (!type.endsWith('Email')) {
      const text = renderSms(body, vars);
      return { text, length: text.length, max: SMS_MAX };
    }
    const kind = type === 'remindEmail' ? 'remind' : 'invite';
    return {
      subject: fillTemplate(dto?.subject?.trim() || DEFAULT_SUBJECTS[kind], vars),
      html: this.mailer.previewInvitation({
        isNewUser: false,
        email: 'bold@example.mn',
        lastname: vars.lastname,
        firstname: vars.firstname,
        orgName: vars.org,
        year: '2026',
        month: '12',
        day: '31',
        hour: '18',
        minute: '00',
        code: '1'.repeat(17),
        assessment: {
          name: vars.test,
          description: 'Тестийн товч тайлбар энд харагдана.',
          usage: 'Тестийн хэрэглээ энд харагдана.',
          measure: 'Хэмжих зүйлс энд харагдана.',
          advice: '<p>Асуумжид хариулах заавар энд харагдана.</p>',
        } as any,
        body: fillHtml(body, vars),
      }),
    };
  }

  /** Тест бөглөж дуусгаагүй, хугацаа нь дуусаагүй шалгуулагчдад сануулга. */
  public async remind(
    dto: {
      codes: string[];
      email?: boolean;
      sms?: boolean;
      emailDraft?: number;
      smsDraft?: number;
    },
    owner?: number,
  ) {
    const codes = [...new Set((dto.codes ?? []).map(String))].slice(0, 200);
    const drafts = await this.chooseDrafts('remind', dto);
    let processed = 0;
    let skipped = 0;
    const failures: { code: string; error: string }[] = [];
    for (const code of codes) {
      try {
        const exam = await this.ownedExam(code, owner);
        if (
          exam.userEndDate ||
          (exam.endDate && new Date(exam.endDate).getTime() < Date.now())
        ) {
          skipped++;
          continue;
        }
        await this.notifyExam(exam, 'remind', {
          email: !!dto.email,
          sms: !!dto.sms,
          drafts,
        });
        processed++;
      } catch (err: any) {
        failures.push({ code, error: err?.message?.slice(0, 500) || 'unknown' });
      }
    }
    return {
      success: failures.length === 0,
      processed,
      skipped,
      failed: failures.length,
      failures: failures.length ? failures : undefined,
    };
  }

  public async sendLinkToMail(
    dto: SendLinkToEmails,
    id?: number,
    owner?: number,
  ) {
    const links = dto.links || [];
    if (links.length === 0) {
      return { success: true, processed: 0, failed: 0 };
    }

    // Bounded concurrency to avoid bursting DB / Resend when many invites
    // are submitted in quick succession (e.g. 50 x 3 batches).
    const CONCURRENCY = 3;
    const drafts = await this.chooseDrafts('invite', dto);

    const processOne = async (email: SendLinkToEmail) => {
      const exam = await this.ownedExam(email.code, owner);
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

      await this.notifyExam(
        {
          ...exam,
          email: email.email,
          firstname: email.firstname,
          lastname: email.lastname,
          phone: email.phone,
          visible: email.visible,
        },
        'invite',
        {
          email: !dto.noEmail,
          sms: !!dto.sms,
          isNewUser,
          password: generatedPassword,
          id,
          drafts,
        },
      );
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
  public async generatePublicQr(
    serviceId: number,
    requester: { id: number; role: number },
    expires?: string,
  ) {
    const service = await this.dao.findOne(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    // №8: байгууллага зөвхөн ӨӨРИЙН service-ийн QR-ыг гаргана (өмнө нь дурын service id-д боломжтой байв).
    if (
      +requester.role === Role.organization &&
      service.user?.id !== +requester.id
    ) {
      throw new HttpException(
        'Энэ үйлчилгээний QR гаргах эрхгүй байна.',
        HttpStatus.FORBIDDEN,
      );
    }

    const base = (process.env.WEB ?? 'https://hire.mn').replace(/\/$/, '');
    let url = `${base}/exam/public/${serviceId}`;
    // №8: хугацаатай QR — `expires` (epoch ms) гарын үсэгтэй, сервер шалгана (utils/qr-expiry.ts).
    const expMs = parseQrExpiry(expires);
    if (Number.isNaN(expMs)) {
      throw new HttpException(
        'QR-ийн хүчинтэй хугацаа буруу байна (ирээдүйн, 1 жилээс ихгүй огноо).',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (expMs != null) {
      url += `?expires=${expMs}&sig=${signQrExpiry(serviceId, expMs)}`;
    }

    const qrDataUrl = await generateQrWithLogo(url);

    const assessmentName = service.assessment?.name ?? '';
    const orgName =
      service.user?.organizationName ?? service.user?.firstname ?? '';
    const showResultOnComplete = effectiveShowResult(
      service,
      service.assessment,
    );

    return {
      qr: qrDataUrl,
      url,
      assessmentName,
      orgName,
      showResultOnComplete,
      expiresAt: expMs ?? null,
      // Үлдсэн эрх — UI-д харуулж, "Эрх нэмэх"-ийг санал болгоно.
      remaining: Math.max(0, (service.count ?? 0) - (service.usedUserCount ?? 0)),
    };
  }

  /**
   * №6: service бүрийн "дууссаны дараа үр дүн харуулах" тохиргоо. Байгууллага зөвхөн ӨӨРИЙН service-д;
   * admin / tester / super_admin аль ч service-д. `null` → assessment-ийн default руу буцаана.
   */
  public async setShowResult(
    serviceId: number,
    value: unknown,
    actor: { id: number; role: number },
  ) {
    if (value !== null && typeof value !== 'boolean') {
      throw new HttpException('Утга буруу байна.', HttpStatus.BAD_REQUEST);
    }
    const service = await this.dao.findForPayment(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    if (
      +actor.role === Role.organization &&
      service.user?.id !== +actor.id
    ) {
      throw new HttpException(
        'Энэ үйлчилгээг өөрчлөх эрхгүй байна.',
        HttpStatus.FORBIDDEN,
      );
    }
    await this.dao.setShowResult(serviceId, value as boolean | null);
    return {
      showResult: value,
      effective: effectiveShowResult(
        { showResult: value as boolean | null },
        service.assessment,
      ),
    };
  }

  /**
   * №8: "Эрх нэмэх" (top-up).
   *  - байгууллага (ЭЗЭМШИГЧ): `assessment.price × count`-ийг wallet-аас АТОМАР хасаж, `count`-ыг нэмнэ
   *    (нэг транзакц; хүрэлцэхгүй бол 402, юу ч өөрчлөгдөхгүй).
   *  - admin / super_admin: ҮНЭГҮЙ (гараар) нэмнэ; `transaction` мөрөнд (үнэ 0, хэн нэмсэн) аудит үлдээнэ.
   * Төлбөр баталгаажаагүй (`status !== SUCCESS`) service дээр боломжгүй.
   */
  public async topUp(
    serviceId: number,
    countRaw: unknown,
    actor: { id: number; role: number },
  ) {
    const count = Number(countRaw);
    if (!Number.isInteger(count) || count < 1 || count > MAX_TOPUP_COUNT) {
      throw new HttpException(
        `Нэмэх эрхийн тоо 1–${MAX_TOPUP_COUNT} хооронд бүхэл тоо байна.`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const service = await this.dao.findForPayment(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    const role = +actor.role;
    const isStaff = role === Role.admin || role === Role.super_admin;
    if (!isStaff) {
      if (role !== Role.organization || service.user?.id !== +actor.id) {
        throw new HttpException(
          'Энэ үйлчилгээнд эрх нэмэх эрхгүй байна.',
          HttpStatus.FORBIDDEN,
        );
      }
    }
    if (+(service.status ?? 0) !== PaymentStatus.SUCCESS) {
      throw new HttpException(
        'Төлбөр баталгаажаагүй үйлчилгээнд эрх нэмэх боломжгүй.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const unit = Number(service.assessment?.price ?? 0);
    const charge = isStaff ? 0 : unit * count;
    const result = await this.dao.topUpAtomic(
      serviceId,
      count,
      charge,
      charge > 0 ? service.user.id : null,
    );

    // Аудит. Мөнгө / суудал аль хэдийн атомараар хөдөлсөн тул бүртгэл унасан ч хэрэглэгчид алдаа өгөхгүй,
    // харин лог дээр ил үлдээнэ (гараар тулгана).
    try {
      await this.transactionDao.create(
        {
          price: isStaff ? 0 : unit,
          assesmentName: service.assessment?.name,
          assessment: service.assessment?.id,
          count,
          service: serviceId,
          user: +actor.id,
        },
        isStaff ? 0 : 2,
      );
    } catch (error) {
      console.error(
        `❌ topUp аудит бичигдсэнгүй service=${serviceId} actor=${actor.id} count=${count} charge=${charge}:`,
        (error as any)?.message,
      );
    }

    return {
      serviceId,
      added: count,
      charged: charge,
      count: result.count,
      usedUserCount: result.usedUserCount,
      remaining: result.count - result.usedUserCount,
      wallet: result.wallet,
      manual: isStaff,
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
    expiry?: { expires?: unknown; sig?: unknown },
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

    // Ижил email/phone-тэй хүн энэ QR (service) дээр ДУУСААГҮЙ exam-тай бол (7 хоног хүртэл), эсвэл
    // сүүлийн 24 цагт дуусгасан бол ШИНЭ exam үүсгэхгүй (quota дахин
    // зарцуулахгүй, давхар мөр үүсгэхгүй) — байгаа кодыг нь буцаана. (№3, exam-resume.ts)
    // /exam/:code хуудас руу орохдоо updateByCode нь category===undefined
    // үед forceLogin-ийг заавал (дахин) хийдэг тул тухайн хүн шууд өөрийн
    // эрхээр нэвтэрнэ ("бүртгэлтэй бол force login").
    const existing = await this.examDao.findByServiceAndContact(
      serviceId,
      email,
      phone,
    );
    if (existing) {
      // №3: `finished` — дууссан бол клиент шууд үр дүн рүү (эсвэл "Үр дүн харах" карт), үгүй бол үргэлжлүүлнэ.
      return { code: existing.code, finished: existing.finished };
    }

    // №8: QR-ийн хугацаа (гарын үсэгтэй). Аль хэдийн бүртгэлтэй, дуусаагүй оролцогч дээрх `existing` салбараар
    // үргэлжлүүлнэ; ШИНЭ оролцогчийг л хугацаа дууссан QR татгалзана.
    const exp = checkQrExpiry(serviceId, expiry?.expires, expiry?.sig);
    if (exp === 'invalid') {
      throw new HttpException('QR холбоос буруу байна.', HttpStatus.BAD_REQUEST);
    }
    if (exp === 'expired') {
      throw new HttpException('Энэ QR-ийн хугацаа дууссан байна.', HttpStatus.GONE);
    }

    // №8: суудлыг АТОМАР захиална (шалгалт + нэмэлт нэг UPDATE) — зэрэг бүртгэлээр квотоос хэтрэхгүй.
    // Үнэгүй (`price == 0`) service-ийн public QR-д квот үйлчилдэггүй (хуучин зан төлөв — зөвхөн тоолно).
    if (!(await this.dao.reserveSeats(serviceId, 1, service.price != 0))) {
      throw new HttpException(
        'Тестийн эрх дууссан байна.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    let examCode: any;
    try {
      examCode = await this.examService.create(
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
    } catch (error) {
      await this.dao.releaseSeats(serviceId, 1);
      throw error;
    }

    // ⚠️ Хэрэглэгчийг ЯГ ЭНД үүсгэнэ.
    // Өмнө нь public QR-аар бүртгүүлэхэд зөвхөн exam мөр дээр firstname/
    // lastname/email/phone хадгалагдаад, бодит UserEntity нь зөвхөн
    // /exam/:code хуудас `updateByCode`-г (category === undefined) дуудах
    // үед л lazy байдлаар үүсдэг байсан. Гэтэл `updateByCode` нь
    // `userEndDate != null` (тест дууссан) үед forceLogin хийхээс өмнө
    // throw хийдэг тул — хэрэглэгч эхний оролдлого дээр ямар нэг шалтгаанаар
    // (сүлжээ тасрах, өөр төхөөрөмжөөс нээх, эсвэл тестээ дуусгасны дараа
    // refresh хийх) token авч чадаагүй бол ХЭЗЭЭ Ч авч чадахгүй үлддэг
    // байсан. Үүнээс болж тест өгсөн (тэр дундаа төлбөр төлсөн) хэрэглэгчид
    // тайлангаа харж чаддаггүй байв.
    const loginEmail =
      (email ?? (phone ? `${phone}@hire.mn` : null))?.toLowerCase() ?? null;
    if (loginEmail) {
      try {
        const auth = await this.authService.forceLogin(
          loginEmail,
          phone,
          dto.lastname ?? '',
          dto.firstname ?? '',
        );
        await this.examDao.update(examCode, { user: auth.user });
      } catch (error) {
        // Хэрэглэгч үүсгэж чадаагүй ч тест эхлүүлэхэд саад болохгүй —
        // /exam/access/:code endpoint дараа нь дахин оролдоно.
        console.error(
          '❌ createPublicExam: хэрэглэгч үүсгэхэд алдаа гарлаа:',
          (error as any)?.message,
        );
      }
    }

    // (суудал дээр `reserveSeats`-ээр аль хэдийн тоологдсон)

    // №3: и-мэйл өгсөн бол "үргэлжлүүлэх" холбоос (зөвхөн шинэ exam үед). Илгээж чадаагүй ч бүртгэлд саад болохгүй.
    if (email) {
      try {
        await this.mailer.sendPublicResume({
          email,
          code: `${examCode}`,
          firstname: dto.firstname,
          lastname: dto.lastname,
          phone: phone ?? undefined,
          assessmentName: service.assessment?.name,
        });
      } catch (error) {
        console.error(
          '❌ createPublicExam: үргэлжлүүлэх холбоос илгээхэд алдаа:',
          (error as any)?.message,
        );
      }
    }

    return { code: examCode, finished: false };
  }

  public async getPublicServiceInfo(
    serviceId: number,
    expiry?: { expires?: unknown; sig?: unknown },
  ) {
    const service = await this.dao.findOne(serviceId);
    if (!service) {
      throw new HttpException('Үйлчилгээ олдсонгүй.', HttpStatus.NOT_FOUND);
    }
    // №8: хугацаа дууссан / буруу QR бол хуудас урьдчилан мэдэгдэнэ (сервер `public-register`-д дахин шалгана).
    const exp = checkQrExpiry(serviceId, expiry?.expires, expiry?.sig);
    return {
      assessmentName: service.assessment?.name ?? '',
      orgName: service.user?.organizationName ?? service.user?.firstname ?? '',
      expired: exp === 'expired',
      invalidLink: exp === 'invalid',
    };
  }
}
