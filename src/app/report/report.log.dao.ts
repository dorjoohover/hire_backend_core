import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ReportLogEntity } from './report.log.entity';
import { ReportLogDto } from './report.log.dto';
import { REPORT_STATUS } from 'src/base/constants';

@Injectable()
export class ReportLogDao {
  private db: Repository<ReportLogEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ReportLogEntity);
  }

  public async create(dto: ReportLogDto) {
    const log = this.db.create(dto);
    return await this.db.save(log);
  }

  public async getById(id: string) {
    return await this.db.findOne({
      where: {
        id,
      },
    });
  }

  public async getByCode(code: string) {
    return await this.db.findOne({ where: { code } });
  }

  public async getOne(id: string) {
    return await this.db.findOne({
      where: [
        {
          id,
        },
        { code: id },
      ],
    });
  }
  async updateById(id: string, dto: Partial<ReportLogDto>) {
    const result = await this.db.update({ id }, dto);
    if (result.affected === 0) {
      throw new Error(`ReportLog with id ${id} not found`);
    }
  }

  /**
   * COMPLETED → SENT-ийг НЭГ атомар UPDATE-ээр хийнэ. Зөвхөн үүнийг амжилттай
   * хийсэн (affected > 0) ганц дуудлага л мэйл илгээнэ: hire_report-ийн
   * `report/mail` дуудлага ба web-ийн `status` polling зэрэг ирсэн ч давхар
   * мэйл явахгүй; COMPLETED БИШ төлөвт (WRITING, FAILED …) SENT болгохгүй.
   */
  async claimSent(code: string): Promise<boolean> {
    const result = await this.db.update(
      { code, status: REPORT_STATUS.COMPLETED },
      { status: REPORT_STATUS.SENT },
    );
    return (result.affected ?? 0) > 0;
  }

  async updateByCode(code: string, dto: Partial<ReportLogDto>) {
    const result = await this.db.update({ code }, dto);

    if (result.affected === 0) {
      throw new Error(`ReportLog with code ${code} not found`);
    }
  }
}
