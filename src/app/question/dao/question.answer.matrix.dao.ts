import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { QuestionAnswerMatrixEntity } from '../entities/question.answer.matrix.entity';
import { CreateQuestionAnswerMatrixDto } from '../dto/create-question.answer.matrix.dto';
import { QuestionAnswerViewService } from '../question-answer-view.service';

@Injectable()
export class QuestionAnswerMatrixDao {
  private db: Repository<QuestionAnswerMatrixEntity>;
  constructor(
    private dataSource: DataSource,
    private viewService: QuestionAnswerViewService,
  ) {
    this.db = this.dataSource.getRepository(QuestionAnswerMatrixEntity);
  }

  create = async (dto: CreateQuestionAnswerMatrixDto) => {
    const res = this.db.create({
      ...dto,
      question: {
        id: dto.question,
      },
      category: {
        id: dto.category as number,
      },
      answer: {
        id: dto.answer,
      },
    });
    await this.db.save(res);
    this.viewService.refresh();
    return res.id;
  };

  deleteOne = async (id: number) => {
    const res = await this.db.delete(id);
    this.viewService.refresh();
    return res;
  };

  updateOne = async (id: number, dto: CreateQuestionAnswerMatrixDto) => {
    const res = await this.db.findOne({
      where: { id: id },
      relations: ['category'],
    });
    const update =
      res.value == dto.value &&
      res.point == dto.point &&
      res.orderNumber == dto.orderNumber &&
      res.category?.id == dto.category;
    if (update) return id;
    await this.db.update(id, {
      ...dto,
      category: {
        id: dto.category as number,
      },
      question: {
        id: dto.question,
      },
      answer: {
        id: dto.answer,
      },
    });
    this.viewService.refresh();
    return id;
  };

  findAll = async () => {
    return await this.db.find({
      //   relations: [''],
    });
  };

  findOne = async (id: number) => {
    return await this.db.findOne({
      where: {
        id: id,
      },
      relations: ['question', 'category'],
    });
  };

  findOneOnly = async (id: number) => {
    return await this.db.findOne({ where: { id } });
  };
  query = async (q: string) => {
    return await this.db.query(q);
  };

  findByAnswer = async (id: number) => {
    return await this.db.find({
      where: {
        answer: {
          id: id,
        },
      },
      order: {
        orderNumber: 'ASC',
      },
    });
  };
  findByQuestion = async (id: number, answer: number) => {
    return await this.db.find({
      where: {
        question: {
          id: id,
        },
        answer: {
          id: answer,
        },
      },
      order: {
        orderNumber: 'ASC',
      },
    });
  };

  // Олон matrix хариултын оноо/ангиллыг ганц query-ээр (batch preload).
  findMetaByIds = async (
    ids: number[],
  ): Promise<
    { id: number; categoryId: number | null; point: number | null }[]
  > => {
    if (!ids.length) return [];
    return await this.db.query(
      `SELECT id, "categoryId" AS "categoryId", point
       FROM "questionAnswerMatrix" WHERE id = ANY($1)`,
      [ids],
    );
  };

  clear = async () => {
    const res = await this.db.createQueryBuilder().delete().execute();
    this.viewService.refresh();
    return res;
  };
}
