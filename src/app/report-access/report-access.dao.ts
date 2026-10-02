import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ReportAccessEntity } from './entities/report-access.entity';
import { PaymentStatus } from 'src/base/constants';

@Injectable()
export class ReportAccessDao {
  private db: Repository<ReportAccessEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ReportAccessEntity);
  }

  /** Тухайн exam code дээр төлөгдсөн эрх байгаа эсэх. */
  findPaidByCode = async (code: string) => {
    return await this.db.findOne({
      where: { code: `${code}`, status: PaymentStatus.SUCCESS },
    });
  };

  findByInvoice = async (invoiceId: string) => {
    return await this.db.findOne({ where: { invoiceId } });
  };

  findById = async (id: number) => {
    return await this.db.findOne({ where: { id } });
  };

  findPendingByCode = async (code: string) => {
    return await this.db.findOne({
      where: { code: `${code}`, status: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  };

  /**
   * Сүүлийн `minutes` минутад тухайн code дээр үүссэн нэхэмжлэхийн тоо
   * (invoice spam хязгаарлахад). Цагийг DB-ийн NOW()-оор харьцуулна —
   * `createdAt` нь DB-ийн CURRENT_TIMESTAMP default тул Node/DB цагийн бүс
   * зөрсөн ч алдаа гарахгүй.
   */
  countRecentByCode = async (code: string, minutes: number) => {
    return await this.db
      .createQueryBuilder('r')
      .where('r.code = :code', { code: `${code}` })
      .andWhere(`r."createdAt" > NOW() - INTERVAL '1 minute' * :minutes`, {
        minutes,
      })
      .getCount();
  };

  create = async (dto: Partial<ReportAccessEntity>) => {
    const row = this.db.create(dto);
    return await this.db.save(row);
  };

  setInvoice = async (id: number, invoiceId: string) => {
    await this.db.update(id, { invoiceId });
  };

  /**
   * PENDING → SUCCESS. Идемпотент: polling ба QPay callback зэрэг ирвэл эхний
   * нь л мөрийг шинэчилнэ (`paidAt` дарагдахгүй).
   */
  markPaid = async (id: number) => {
    await this.db.update(
      { id, status: PaymentStatus.PENDING },
      { status: PaymentStatus.SUCCESS, paidAt: new Date() },
    );
    return await this.db.findOne({ where: { id } });
  };

  findAllByCode = async (code: string) => {
    return await this.db.find({
      where: { code: `${code}` },
      order: { createdAt: 'DESC' },
    });
  };
}
