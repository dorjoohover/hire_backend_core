import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PdfTemplateEntity } from './entities/pdf-template.entity';
import { CreatePdfTemplateDto } from './dto/create-pdf-template.dto';
import { UpdatePdfTemplateDto } from './dto/update-pdf-template.dto';

@Injectable()
export class PdfTemplateDao {
  private db: Repository<PdfTemplateEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(PdfTemplateEntity);
  }

  create = async (dto: CreatePdfTemplateDto) => {
    // Frontend "хадгалах" нь бүх template object-ыг явуулдаг тул шинэ мөр
    // үүсгэхэд хамааралгүй/санамсаргүй id, createdAt, updatedAt орж ирж болно.
    // isActive-ийг ч мөн эндээс зөвшөөрөхгүй — идэвхжүүлэлт зөвхөн
    // setActive() route-оор л хийгдэнэ (нэг assessment дээр 1 идэвхтэй мөр
    // байх invariant-ыг зөрчихгүйн тулд).
    const { id, createdAt, updatedAt, isActive, ...clean } = dto as any;
    const entity = this.db.create(clean as PdfTemplateEntity);
    return await this.db.save(entity);
  };

  findAll = async (assessmentTypeCode?: string, assessmentId?: number) => {
    const where: Record<string, any> = {};
    if (assessmentTypeCode) where.assessmentTypeCode = assessmentTypeCode;
    if (assessmentId) where.assessmentId = assessmentId;
    return await this.db.find({
      where,
      order: { updatedAt: 'DESC' },
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({ where: { id } });
  };

  update = async (id: number, dto: UpdatePdfTemplateDto) => {
    // Энгийн "Хадгалах" (update) дараах isActive төлвийг өөрчлөхгүй —
    // идэвхжүүлэлт зөвхөн setActive()-ээр.
    const { id: _ignoreId, createdAt, updatedAt, isActive, ...clean } = dto as any;
    await this.db.update(id, clean);
    return await this.findOne(id);
  };

  // Тухайн assessmentId дээрх бусад бүх мөрийг idle болгоод, зөвхөн id-г
  // идэвхжүүлнэ (report generation яг үүнийг ашиглана). Race-аас сэргийлж
  // нэг transaction дотор хийнэ.
  setActive = async (id: number, assessmentId: number) => {
    return await this.dataSource.transaction(async (manager) => {
      await manager.update(
        PdfTemplateEntity,
        { assessmentId },
        { isActive: false },
      );
      await manager.update(PdfTemplateEntity, { id }, { isActive: true });
      return await manager.findOne(PdfTemplateEntity, { where: { id } });
    });
  };

  remove = async (id: number) => {
    return await this.db.delete(id);
  };
}
