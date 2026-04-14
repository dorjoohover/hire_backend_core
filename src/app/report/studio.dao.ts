import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StudioDto } from './studio.dto';
import { StudioEntity } from './studio.entity';

@Injectable()
export class StudioDao {
  private db: Repository<StudioEntity>;

  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(StudioEntity);
  }

  public async create(dto: StudioDto) {
    const studio = this.db.create(dto);
    return await this.db.save(studio);
  }

  public async getOne(id: number | string) {
    if (typeof id === 'number') {
      return await this.db.findOne({
        where: { id },
        relations: ['assessment'],
      });
    }

    return await this.db.findOne({
      where: [{ key: id }],
      relations: ['assessment'],
    });
  }

  public async findByAssessment(assessmentId: number) {
    return await this.db.find({
      where: { assessmentId },
      order: { updatedAt: 'DESC' },
    });
  }

  public async findByAssessmentAndReportType(
    assessmentId: number,
    reportType: string,
  ) {
    return await this.db.find({
      where: { assessmentId, reportType },
      order: { updatedAt: 'DESC' },
    });
  }

  public async findAll(filters?: {
    assessmentId?: number;
    reportType?: string;
    reportTypeCode?: number;
    limit?: number;
  }) {
    const query = this.db
      .createQueryBuilder('studio')
      .leftJoinAndSelect('studio.assessment', 'assessment')
      .orderBy('studio.updatedAt', 'DESC');

    if (filters?.assessmentId) {
      query.andWhere('studio."assessmentId" = :assessmentId', {
        assessmentId: filters.assessmentId,
      });
    }

    if (filters?.reportType) {
      query.andWhere('studio."reportType" = :reportType', {
        reportType: filters.reportType,
      });
    }

    if (filters?.reportTypeCode !== undefined) {
      query.andWhere('studio."reportTypeCode" = :reportTypeCode', {
        reportTypeCode: filters.reportTypeCode,
      });
    }

    if (filters?.limit) {
      query.take(filters.limit);
    }

    return await query.getMany();
  }

  public async findLatestByAssessmentAndReportTypeCode(
    assessmentId: number,
    reportTypeCode: number,
  ) {
    return await this.db.findOne({
      where: { assessmentId, reportTypeCode },
      order: { updatedAt: 'DESC' },
      relations: ['assessment'],
    });
  }

  public async findLatestByAssessmentAndReportType(
    assessmentId: number,
    reportType: string,
  ) {
    return await this.db.findOne({
      where: { assessmentId, reportType },
      order: { updatedAt: 'DESC' },
      relations: ['assessment'],
    });
  }

  public async update(id: number, dto: Partial<StudioDto>) {
    await this.db.update({ id }, dto);
    return await this.getOne(id);
  }
}
