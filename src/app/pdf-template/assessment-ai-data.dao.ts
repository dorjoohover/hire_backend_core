import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AssessmentAiDataEntity } from './entities/assessment-ai-data.entity';

@Injectable()
export class AssessmentAiDataDao {
  private db: Repository<AssessmentAiDataEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(AssessmentAiDataEntity);
  }

  findByAssessmentId = async (assessmentId: number) => {
    return await this.db.findOne({ where: { assessmentId } });
  };

  // assessmentId дээр аль хэдийн мөр байвал шинэчилнэ, байхгүй бол шинээр
  // үүсгэнэ (upsert) — Studio AI Data tab-ийн форм бичих бүрт дуудагдана.
  upsert = async (assessmentId: number, data: Record<string, any>) => {
    const existing = await this.findByAssessmentId(assessmentId);
    if (existing) {
      await this.db.update(existing.id, { data });
      return await this.findByAssessmentId(assessmentId);
    }
    const entity = this.db.create({ assessmentId, data });
    return await this.db.save(entity);
  };
}
