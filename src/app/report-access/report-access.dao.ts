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

  findPendingByCode = async (code: string) => {
    return await this.db.findOne({
      where: { code: `${code}`, status: PaymentStatus.PENDING },
      order: { createdAt: 'DESC' },
    });
  };

  create = async (dto: Partial<ReportAccessEntity>) => {
    const row = this.db.create(dto);
    return await this.db.save(row);
  };

  setInvoice = async (id: number, invoiceId: string) => {
    await this.db.update(id, { invoiceId });
  };

  markPaid = async (id: number) => {
    await this.db.update(id, {
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
    });
    return await this.db.findOne({ where: { id } });
  };

  findAllByCode = async (code: string) => {
    return await this.db.find({
      where: { code: `${code}` },
      order: { createdAt: 'DESC' },
    });
  };
}
