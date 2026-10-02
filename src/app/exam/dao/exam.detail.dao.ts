import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ExamDetailEntity } from '../entities/exam.detail.entity';
import { CreateExamDetailDto } from '../dto/create-exam.detail.dto';

@Injectable()
export class ExamDetailDao {
  private db: Repository<ExamDetailEntity>;
  constructor(private dataSource: DataSource) {
    this.db = this.dataSource.getRepository(ExamDetailEntity);
  }

  create = async (dto: CreateExamDetailDto) => {
    const res = this.db.create({
      ...dto,
      exam: { id: dto.exam },
      question: { id: dto.question },
      questionCategory: { id: dto.questionCategory },
      service: { id: dto.service },
    });
    await this.db.save(res);
  };

  /**
   * №3: нээлт бүрд `examDetail` давхардахгүй болгоно. Өмнө нь `create` нэг мөрөөр, unique-гүй тул
   * bootstrap-ийн 2 дуудлага + reload бүр (exam, question) мөрийг ДАВХАРДУУЛДАG байсан.
   * Одоо байгааг нь алгасаад дутууг нэг INSERT-ээр нэмнэ; unique индекс
   * (`ops/shared/examdetail-unique.sql`) байвал `ON CONFLICT DO NOTHING` зэрэгцээ хүсэлтийг ч хамгаална
   * (индексгүй үед ч алдаагүй ажиллана). Буцаах утга: шинээр нэмсэн мөрийн тоо.
   */
  createManyIfAbsent = async (
    rows: {
      exam: number;
      question: number;
      questionCategory: number;
      questionCategoryName: string;
      service: number | null;
    }[],
  ): Promise<number> => {
    if (!rows.length) return 0;
    const examId = rows[0].exam;
    const existing = new Set<number>(
      (
        await this.db.query(
          `SELECT "questionId" FROM "examDetail" WHERE "examId" = $1`,
          [examId],
        )
      ).map((r: any) => Number(r.questionId)),
    );
    const seen = new Set<number>();
    const fresh = rows.filter((r) => {
      const q = Number(r.question);
      if (existing.has(q) || seen.has(q)) return false;
      seen.add(q);
      return true;
    });
    if (!fresh.length) return 0;

    const params: any[] = [];
    const values = fresh.map((r) => {
      const i = params.length;
      params.push(
        r.questionCategoryName ?? null,
        r.exam,
        r.question,
        r.questionCategory,
        r.service ?? null,
      );
      return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`;
    });
    await this.db.query(
      `INSERT INTO "examDetail"
         ("questionCategoryName", "examId", "questionId", "questionCategoryId", "serviceId")
       VALUES ${values.join(', ')}
       ON CONFLICT DO NOTHING`,
      params,
    );
    return fresh.length;
  };

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };
  findByExam = async (exam: number) => {
    return await this.db.find({
      where: {
        exam: {
          id: exam,
        },
      },
      order: {
        id: 'ASC',
      },
    });
  };
  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      //   relations: ['level'],
    });
  };
}
