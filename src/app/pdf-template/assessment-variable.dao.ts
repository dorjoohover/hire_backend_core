import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssessmentVariableEntity } from './entities/assessment-variable.entity';

@Injectable()
export class AssessmentVariableDao {
  private db: Repository<AssessmentVariableEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(AssessmentVariableEntity);
  }

  findAllByAssessmentId = async (assessmentId: number) => {
    return await this.db.find({ where: { assessmentId }, order: { key: 'ASC' } });
  };

  findOne = async (assessmentId: number, key: string) => {
    return await this.db.findOne({ where: { assessmentId, key } });
  };

  // assessmentId+key дээр аль хэдийн мөр байвал шинэчилнэ, байхгүй бол
  // шинээр үүсгэнэ (upsert) — Studio-ийн "Хэрэглэгчийн variable" tab-ийн
  // форм бичих бүрт дуудагдана.
  upsert = async (
    assessmentId: number,
    key: string,
    label: string | undefined,
    entries: Record<string, string>,
  ) => {
    const existing = await this.findOne(assessmentId, key);
    if (existing) {
      await this.db.update(existing.id, { label, entries });
      return await this.findOne(assessmentId, key);
    }
    const entity = this.db.create({ assessmentId, key, label, entries });
    return await this.db.save(entity);
  };

  remove = async (assessmentId: number, key: string) => {
    const existing = await this.findOne(assessmentId, key);
    if (!existing) return { deleted: false };
    await this.db.delete(existing.id);
    return { deleted: true };
  };
}
